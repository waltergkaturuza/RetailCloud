"""
Views for tenant self-signup.
"""
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
import secrets
import string
from .models import Tenant
from accounts.models import User
from accounts.verification_models import EmailVerificationToken
from subscriptions.models import Subscription, TenantModule, Payment
from .pricing_service import get_active_pricing_rule, calculate_module_pricing
from .owner_serializers import TenantCreateUpdateSerializer
from .payment_gateway import process_subscription_payment, PaymentGatewayError
from .email_service import send_verification_email, send_welcome_email, send_trial_approval_email
import logging

logger = logging.getLogger(__name__)


class TenantSignupView(views.APIView):
    """
    Tenant self-signup endpoint.
    Allows tenants to sign up with either:
    - Direct subscription (auto-approved, payment required)
    - 7-day trial (requires owner approval)
    """
    permission_classes = [AllowAny]
    
    @transaction.atomic
    def post(self, request):
        """
        Create a new tenant with admin user.
        
        Expected payload:
        {
            "company_name": "Company Name",
            "contact_person": "John Doe",
            "email": "admin@company.com",
            "phone": "+1234567890",
            "address": "123 Main St",
            "city": "City",
            "country": "Country",
            "subscription_type": "monthly" | "yearly",
            "signup_option": "trial" | "subscription",
            "password": "secure_password",
            // ... other tenant fields
        }
        """
        data = request.data.copy()
        
        # Validate required fields
        required_fields = ['company_name', 'contact_person', 'email', 'phone', 'password', 'signup_option', 'timezone', 'currency']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return Response(
                {'error': f'Missing required fields: {", ".join(missing_fields)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        signup_option = data.pop('signup_option')
        if signup_option not in ['trial', 'subscription']:
            return Response(
                {'error': 'signup_option must be either "trial" or "subscription"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate slug from company name
        company_name = data.get('company_name', '').strip()
        base_slug = ''.join(c.lower() if c.isalnum() or c in '-_' else '-' for c in company_name)
        base_slug = '-'.join(base_slug.split())
        
        # Ensure slug is unique
        slug = base_slug
        counter = 1
        while Tenant.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        data['slug'] = slug
        data['name'] = slug  # Use slug as name
        
        # Get package if provided
        package_id = data.pop('package_id', None)
        package = None
        if package_id:
            try:
                from .models import Package
                package = Package.objects.get(id=package_id, is_active=True)
            except Package.DoesNotExist:
                return Response(
                    {'error': f'Package with id {package_id} not found or inactive'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif signup_option == 'subscription':
            # Default to first active package if none selected
            from .models import Package
            package = Package.objects.filter(is_active=True).order_by('sort_order', 'price_monthly').first()
            if not package:
                return Response(
                    {'error': 'No active subscription packages available. Please contact support.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Set subscription status based on signup option
        if signup_option == 'trial':
            data['subscription_status'] = 'trial'
            # Set trial ends at 7 days from now
            data['trial_ends_at'] = timezone.now() + timedelta(days=7)
        else:
            # For subscription, they need to pay first
            # Set to trial initially, will be activated after payment
            data['subscription_status'] = 'trial'  # Will be set to 'active' after payment
            data['trial_ends_at'] = None
            data['subscription_ends_at'] = None
        
        # Set default subscription type
        if 'subscription_type' not in data:
            data['subscription_type'] = 'monthly'
        
        # Validate and create tenant
        serializer = TenantCreateUpdateSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        tenant = serializer.save()
        
        # Create admin user for the tenant
        password = data.get('password')
        email = data.get('email').lower().strip() if data.get('email') else None
        contact_person = data.get('contact_person', '')
        
        # Double-check email doesn't exist as a User (even though serializer should catch this)
        # This is a safety check in case someone bypasses the serializer
        if User.objects.filter(email__iexact=email).exists():
            # Rollback tenant creation
            tenant.delete()
            return Response(
                {'email': ['This email is already registered as a user account. Please use a different email.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Extract first and last name from contact_person
        contact_parts = contact_person.split(' ', 1) if contact_person else ['', '']
        first_name = contact_parts[0] if len(contact_parts) > 0 else 'Admin'
        last_name = contact_parts[1] if len(contact_parts) > 1 else company_name
        
        # Generate unique username
        base_username = slug + '_admin'
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1
        
        # Create tenant admin user (email not verified initially for new signups)
        # Note: Using the same email as tenant is allowed (tenant admin uses tenant contact email)
        try:
            admin_user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                phone=data.get('phone', ''),
                role='tenant_admin',
                tenant=tenant,
                is_active=True,
                is_staff=True,
                is_email_verified=False,  # Require email verification for new signups
                email_verified_at=None,
            )
        except Exception as e:
            # Rollback tenant creation if user creation fails
            tenant.delete()
            error_msg = str(e)
            if 'email' in error_msg.lower() or 'unique' in error_msg.lower():
                return Response(
                    {'email': ['This email is already registered. Please use a different email.']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(
                {'error': f'Failed to create user account: {error_msg}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Generate email verification token and send verification email
        try:
            verification_token = EmailVerificationToken.generate_token(admin_user)
            send_verification_email(
                user_email=email,
                verification_token=verification_token.token,
                username=username
            )
            logger.info(f"Verification email sent to {email} for tenant signup")
        except Exception as e:
            logger.error(f"Failed to send verification email to {email}: {str(e)}", exc_info=True)
            # Don't fail signup if email sending fails
        
        # Create main branch for the tenant
        from .models import Branch
        Branch.objects.create(
            tenant=tenant,
            name='Main Branch',
            code='MAIN',
            address=data.get('address', ''),
            city=data.get('city', ''),
            country=data.get('country', 'Zimbabwe'),
            is_main=True,
            is_active=True,
        )
        
        # Create subscription if package is provided
        subscription = None
        if package:
            subscription_period_start = timezone.now()
            if signup_option == 'subscription':
                # For paid subscription, set period end based on billing cycle
                if data.get('subscription_type') == 'yearly':
                    subscription_period_end = subscription_period_start + timedelta(days=365)
                else:
                    subscription_period_end = subscription_period_start + timedelta(days=30)
            else:
                # For trial, set period end to trial end date
                subscription_period_end = tenant.trial_ends_at if tenant.trial_ends_at else subscription_period_start + timedelta(days=7)
            
            subscription = Subscription.objects.create(
                tenant=tenant,
                package=package,
                billing_cycle=data.get('subscription_type', 'monthly'),
                status='trial' if signup_option == 'trial' else 'trial',  # Will be 'active' after payment for subscriptions
                current_period_start=subscription_period_start,
                current_period_end=subscription_period_end,
            )
        
        # Process payment if provided (for subscription signup)
        payment_processed = False
        payment_transaction = None
        payment_data = data.get('payment_data')
        if signup_option == 'subscription' and payment_data and package:
            try:
                # Calculate payment amount
                payment_amount = package.price_yearly if data.get('subscription_type') == 'yearly' else package.price_monthly
                
                # Process payment through gateway
                payment_success, payment_result = process_subscription_payment(
                    tenant_id=tenant.id,
                    package_id=package.id,
                    amount=payment_amount,
                    currency=package.currency,
                    payment_data=payment_data,
                    billing_cycle=data.get('subscription_type', 'monthly')
                )
                
                if payment_success:
                    payment_processed = True
                    
                    # Create payment record
                    payment_transaction = Payment.objects.create(
                        tenant=tenant,
                        subscription=subscription,
                        amount=payment_amount,
                        currency=package.currency,
                        payment_method=payment_data.get('payment_method', 'card'),
                        status='completed',
                        transaction_id=payment_result.get('transaction_id', ''),
                        stripe_payment_intent_id=payment_result.get('payment_intent_id', ''),
                        paid_at=timezone.now(),
                    )
                    
                    # Activate subscription
                    if subscription:
                        subscription.status = 'active'
                        subscription.stripe_customer_id = payment_result.get('customer_id')
                        subscription.stripe_subscription_id = payment_result.get('subscription_id')
                        subscription.save()
                    
                    tenant.subscription_status = 'active'
                    tenant.save()
                    
                    logger.info(f"Payment processed successfully for tenant {tenant.id}: {payment_result.get('transaction_id')}")
                else:
                    logger.error(f"Payment processing failed for tenant {tenant.id}: {payment_result}")
                    
            except PaymentGatewayError as e:
                logger.error(f"Payment gateway error for tenant {tenant.id}: {str(e)}")
                return Response(
                    {'error': f'Payment processing failed: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                logger.error(f"Payment processing error for tenant {tenant.id}: {str(e)}", exc_info=True)
                return Response(
                    {'error': 'Payment processing failed. Please try again or contact support.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Response data
        response_data = {
            'success': True,
            'message': 'Tenant registered successfully',
            'tenant': {
                'id': tenant.id,
                'slug': tenant.slug,
                'company_name': tenant.company_name,
                'subscription_status': tenant.subscription_status,
                'signup_option': signup_option,
            },
            'admin_user': {
                'username': username,
                'email': email,
            },
        }
        
        # Add trial information
        if signup_option == 'trial':
            trial_start = timezone.now()
            trial_end = tenant.trial_ends_at if tenant.trial_ends_at else trial_start + timedelta(days=7)
            response_data['message'] = 'Trial request submitted successfully. Please verify your email and wait for owner approval.'
            response_data['trial_ends_at'] = trial_end.isoformat()
            response_data['trial_starts_at'] = trial_start.isoformat()
            response_data['trial_duration_days'] = 7
            response_data['trial_start_date'] = trial_start.strftime('%Y-%m-%d')
            response_data['trial_end_date'] = trial_end.strftime('%Y-%m-%d')
            response_data['requires_approval'] = True
            response_data['email_verification_required'] = True
        else:
            if payment_processed:
                response_data['message'] = 'Subscription signup successful! Your account is now active. Please verify your email.'
                response_data['subscription_active'] = True
                response_data['email_verification_required'] = True
                response_data['payment_transaction_id'] = payment_transaction.transaction_id if payment_transaction else None
                
                # Send welcome email
                try:
                    send_welcome_email(
                        user_email=email,
                        company_name=company_name,
                        username=username
                    )
                except Exception as e:
                    logger.error(f"Failed to send welcome email: {str(e)}")
            else:
                response_data['message'] = 'Subscription signup successful. Please complete payment to activate your account.'
                response_data['requires_payment'] = True
                response_data['email_verification_required'] = True
                response_data['package'] = {
                    'id': package.id,
                    'name': package.name,
                    'price_monthly': float(package.price_monthly),
                    'price_yearly': float(package.price_yearly),
                    'currency': package.currency,
                } if package else None
        
        return Response(response_data, status=status.HTTP_201_CREATED)

