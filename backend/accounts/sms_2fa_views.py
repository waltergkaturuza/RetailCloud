"""
SMS 2FA views for sending and verifying SMS codes.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import User
from .sms_2fa_models import SMSVerificationCode
from .sms_service import SMSService
from .security_models import TwoFactorAuth, SecurityEvent
from .security_service import SecurityService


class SMS2FAViewSet(viewsets.ViewSet):
    """SMS 2FA management endpoints."""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def enable(self, request):
        """Enable SMS 2FA for user."""
        phone_number = request.data.get('phone_number')
        if not phone_number:
            return Response(
                {'error': 'Phone number is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate phone number format (basic validation)
        if not phone_number.startswith('+'):
            return Response(
                {'error': 'Phone number must be in E.164 format (e.g., +1234567890).'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create 2FA record
        two_fa, created = TwoFactorAuth.objects.get_or_create(
            user=request.user
        )
        
        # Send verification code
        verification_code = SMSVerificationCode.create_code(
            user=request.user,
            phone_number=phone_number,
            code_length=6,
            expiry_minutes=10
        )
        
        # Send SMS
        success, error = SMSService.send_2fa_code(phone_number, verification_code.code)
        
        if not success:
            return Response(
                {'error': f'Failed to send SMS: {error}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Update 2FA record
        two_fa.phone_number = phone_number
        two_fa.sms_enabled = True
        two_fa.save()
        
        return Response({
            'message': 'Verification code sent to your phone.',
            'phone_number': phone_number,  # Mask in production
            'expires_in_minutes': 10
        })
    
    @action(detail=False, methods=['post'])
    def verify(self, request):
        """Verify SMS code to complete SMS 2FA setup."""
        phone_number = request.data.get('phone_number')
        code = request.data.get('code')
        
        if not phone_number or not code:
            return Response(
                {'error': 'Phone number and code are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find verification code
        verification_code = SMSVerificationCode.objects.filter(
            user=request.user,
            phone_number=phone_number,
            is_used=False
        ).order_by('-created_at').first()
        
        if not verification_code:
            return Response(
                {'error': 'Invalid or expired verification code.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify code
        if verification_code.verify(code):
            # Enable SMS 2FA
            two_fa, created = TwoFactorAuth.objects.get_or_create(
                user=request.user
            )
            two_fa.phone_number = phone_number
            two_fa.sms_enabled = True
            two_fa.is_enabled = True  # Enable 2FA
            two_fa.enabled_at = timezone.now()
            two_fa.save()
            
            # Log security event
            SecurityEvent.objects.create(
                user=request.user,
                tenant=request.user.tenant,
                event_type='2fa_enabled',
                ip_address=self._get_client_ip(request),
                description="SMS 2FA enabled successfully",
                severity='medium',
            )
            
            return Response({
                'message': 'SMS 2FA enabled successfully.'
            })
        
        return Response(
            {'error': 'Invalid verification code.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['post'])
    def send_code(self, request):
        """Send SMS verification code for login."""
        username = request.data.get('username')
        if not username:
            return Response(
                {'error': 'Username is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if SMS 2FA is enabled
        try:
            two_fa = user.two_factor_auth
            if not two_fa.sms_enabled or not two_fa.is_enabled:
                return Response(
                    {'error': 'SMS 2FA is not enabled for this user.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except TwoFactorAuth.DoesNotExist:
            return Response(
                {'error': '2FA is not enabled for this user.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate and send code
        verification_code = SMSVerificationCode.create_code(
            user=user,
            phone_number=two_fa.phone_number,
            code_length=6,
            expiry_minutes=10
        )
        
        success, error = SMSService.send_2fa_code(two_fa.phone_number, verification_code.code)
        
        if not success:
            return Response(
                {'error': f'Failed to send SMS: {error}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'message': 'Verification code sent to your phone.',
            'expires_in_minutes': 10
        })
    
    @action(detail=False, methods=['post'])
    def verify_login(self, request):
        """Verify SMS code during login."""
        username = request.data.get('username')
        code = request.data.get('code')
        
        if not username or not code:
            return Response(
                {'error': 'Username and code are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if SMS 2FA is enabled
        try:
            two_fa = user.two_factor_auth
            if not two_fa.sms_enabled:
                return Response(
                    {'error': 'SMS 2FA is not enabled.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except TwoFactorAuth.DoesNotExist:
            return Response(
                {'error': '2FA is not enabled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find and verify code
        verification_code = SMSVerificationCode.objects.filter(
            user=user,
            phone_number=two_fa.phone_number,
            is_used=False
        ).order_by('-created_at').first()
        
        if not verification_code:
            return Response(
                {'error': 'Invalid or expired verification code.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if verification_code.verify(code):
            return Response({
                'message': 'Code verified successfully.',
                'user_id': user.id,
                'username': user.username
            })
        
        return Response(
            {'error': 'Invalid verification code.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['post'])
    def disable(self, request):
        """Disable SMS 2FA."""
        password = request.data.get('password')
        if not password or not request.user.check_password(password):
            return Response(
                {'error': 'Password is required to disable SMS 2FA.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        two_fa, created = TwoFactorAuth.objects.get_or_create(
            user=request.user
        )
        
        two_fa.sms_enabled = False
        if not two_fa.secret_key:  # If TOTP is also not enabled, disable 2FA completely
            two_fa.is_enabled = False
        two_fa.save()
        
        # Log security event
        SecurityEvent.objects.create(
            user=request.user,
            tenant=request.user.tenant,
            event_type='2fa_disabled',
            ip_address=self._get_client_ip(request),
            description="SMS 2FA disabled",
            severity='medium',
        )
        
        return Response({'message': 'SMS 2FA disabled successfully.'})
    
    def _get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

