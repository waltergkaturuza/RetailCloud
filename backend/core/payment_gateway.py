"""
Payment Gateway Integration Service
Supports multiple payment gateways (Stripe, PayPal, etc.)
Gateway credentials should be stored in environment variables or Django settings
"""
import os
from django.conf import settings
from decimal import Decimal
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class PaymentGatewayError(Exception):
    """Custom exception for payment gateway errors."""
    pass


class PaymentGateway:
    """
    Base class for payment gateway integrations.
    This is a placeholder structure for future payment gateway implementations.
    """
    
    def __init__(self, gateway_name: str = 'stripe'):
        """
        Initialize payment gateway.
        
        Args:
            gateway_name: 'stripe', 'paypal', 'razorpay', etc.
        """
        self.gateway_name = gateway_name
        self.config = self._get_gateway_config()
    
    def _get_gateway_config(self) -> Dict:
        """Get gateway configuration from settings."""
        gateway_configs = {
            'stripe': {
                'api_key': getattr(settings, 'STRIPE_SECRET_KEY', os.environ.get('STRIPE_SECRET_KEY', '')),
                'public_key': getattr(settings, 'STRIPE_PUBLIC_KEY', os.environ.get('STRIPE_PUBLIC_KEY', '')),
                'webhook_secret': getattr(settings, 'STRIPE_WEBHOOK_SECRET', os.environ.get('STRIPE_WEBHOOK_SECRET', '')),
                'enabled': getattr(settings, 'STRIPE_ENABLED', os.environ.get('STRIPE_ENABLED', 'False') == 'True'),
            },
            'paypal': {
                'client_id': getattr(settings, 'PAYPAL_CLIENT_ID', os.environ.get('PAYPAL_CLIENT_ID', '')),
                'client_secret': getattr(settings, 'PAYPAL_CLIENT_SECRET', os.environ.get('PAYPAL_CLIENT_SECRET', '')),
                'mode': getattr(settings, 'PAYPAL_MODE', os.environ.get('PAYPAL_MODE', 'sandbox')),  # 'sandbox' or 'live'
                'enabled': getattr(settings, 'PAYPAL_ENABLED', os.environ.get('PAYPAL_ENABLED', 'False') == 'True'),
            },
        }
        
        return gateway_configs.get(self.gateway_name, {})
    
    def is_configured(self) -> bool:
        """Check if gateway is properly configured."""
        if not self.config.get('enabled', False):
            return False
        
        if self.gateway_name == 'stripe':
            return bool(self.config.get('api_key') and self.config.get('public_key'))
        elif self.gateway_name == 'paypal':
            return bool(self.config.get('client_id') and self.config.get('client_secret'))
        
        return False
    
    def process_payment(
        self,
        amount: Decimal,
        currency: str,
        payment_method_id: str,
        description: str,
        metadata: Optional[Dict] = None
    ) -> Tuple[bool, Dict]:
        """
        Process a payment through the gateway.
        
        Args:
            amount: Payment amount
            currency: Currency code (USD, ZWL, etc.)
            payment_method_id: Payment method token/ID from frontend
            description: Payment description
            metadata: Additional metadata (tenant_id, subscription_id, etc.)
        
        Returns:
            Tuple of (success: bool, response_data: Dict)
        """
        if not self.is_configured():
            logger.warning(f"Payment gateway {self.gateway_name} is not configured. Using mock payment.")
            return self._mock_payment(amount, currency, description, metadata)
        
        try:
            if self.gateway_name == 'stripe':
                return self._process_stripe_payment(amount, currency, payment_method_id, description, metadata)
            elif self.gateway_name == 'paypal':
                return self._process_paypal_payment(amount, currency, payment_method_id, description, metadata)
            else:
                raise PaymentGatewayError(f"Unsupported gateway: {self.gateway_name}")
        except Exception as e:
            logger.error(f"Payment processing error: {str(e)}", exc_info=True)
            raise PaymentGatewayError(f"Payment processing failed: {str(e)}")
    
    def _mock_payment(self, amount: Decimal, currency: str, description: str, metadata: Optional[Dict]) -> Tuple[bool, Dict]:
        """
        Mock payment processing for development/testing.
        In production, this should be replaced with actual gateway integration.
        """
        logger.warning("⚠️ USING MOCK PAYMENT - No actual payment processed!")
        
        import uuid
        return True, {
            'transaction_id': f'mock_{uuid.uuid4().hex[:16]}',
            'status': 'succeeded',
            'amount': float(amount),
            'currency': currency,
            'gateway': self.gateway_name,
            'mock': True,
            'message': 'Mock payment processed. Configure payment gateway for production.',
        }
    
    def _process_stripe_payment(
        self,
        amount: Decimal,
        currency: str,
        payment_method_id: str,
        description: str,
        metadata: Optional[Dict]
    ) -> Tuple[bool, Dict]:
        """
        Process payment via Stripe.
        
        TODO: Implement actual Stripe integration:
        1. Install: pip install stripe
        2. Import: import stripe
        3. Set key: stripe.api_key = self.config['api_key']
        4. Create payment intent or charge
        5. Return transaction details
        """
        # Placeholder for Stripe integration
        # Example:
        # import stripe
        # stripe.api_key = self.config['api_key']
        # 
        # try:
        #     payment_intent = stripe.PaymentIntent.create(
        #         amount=int(amount * 100),  # Convert to cents
        #         currency=currency.lower(),
        #         payment_method=payment_method_id,
        #         confirm=True,
        #         description=description,
        #         metadata=metadata or {},
        #     )
        #     return True, {
        #         'transaction_id': payment_intent.id,
        #         'status': payment_intent.status,
        #         'amount': float(amount),
        #         'currency': currency,
        #         'gateway': 'stripe',
        #     }
        # except stripe.error.StripeError as e:
        #     raise PaymentGatewayError(f"Stripe error: {str(e)}")
        
        logger.warning("Stripe integration not implemented. Using mock payment.")
        return self._mock_payment(amount, currency, description, metadata)
    
    def _process_paypal_payment(
        self,
        amount: Decimal,
        currency: str,
        payment_method_id: str,
        description: str,
        metadata: Optional[Dict]
    ) -> Tuple[bool, Dict]:
        """
        Process payment via PayPal.
        
        TODO: Implement actual PayPal integration:
        1. Install: pip install paypalrestsdk
        2. Configure PayPal SDK with credentials
        3. Create payment
        4. Execute payment
        5. Return transaction details
        """
        # Placeholder for PayPal integration
        logger.warning("PayPal integration not implemented. Using mock payment.")
        return self._mock_payment(amount, currency, description, metadata)
    
    def create_customer(self, email: str, name: str, metadata: Optional[Dict] = None) -> Optional[str]:
        """
        Create a customer in the payment gateway.
        
        Returns:
            Customer ID or None if not configured
        """
        if not self.is_configured():
            return None
        
        try:
            if self.gateway_name == 'stripe':
                # TODO: Implement Stripe customer creation
                # import stripe
                # stripe.api_key = self.config['api_key']
                # customer = stripe.Customer.create(email=email, name=name, metadata=metadata or {})
                # return customer.id
                pass
            elif self.gateway_name == 'paypal':
                # TODO: Implement PayPal customer creation
                pass
        except Exception as e:
            logger.error(f"Failed to create customer: {str(e)}")
        
        return None
    
    def refund_payment(self, transaction_id: str, amount: Optional[Decimal] = None) -> Tuple[bool, Dict]:
        """
        Refund a payment.
        
        Args:
            transaction_id: Original transaction ID
            amount: Partial refund amount (None for full refund)
        
        Returns:
            Tuple of (success: bool, response_data: Dict)
        """
        if not self.is_configured():
            raise PaymentGatewayError("Payment gateway not configured")
        
        # TODO: Implement refund logic
        raise PaymentGatewayError("Refund functionality not yet implemented")


def get_payment_gateway(gateway_name: str = None) -> PaymentGateway:
    """
    Factory function to get configured payment gateway.
    
    Args:
        gateway_name: Preferred gateway name. If None, uses default from settings.
    
    Returns:
        PaymentGateway instance
    """
    if gateway_name is None:
        gateway_name = getattr(settings, 'DEFAULT_PAYMENT_GATEWAY', 'stripe')
    
    return PaymentGateway(gateway_name=gateway_name)


def process_subscription_payment(
    tenant_id: int,
    package_id: int,
    amount: Decimal,
    currency: str,
    payment_data: Dict,
    billing_cycle: str = 'monthly'
) -> Tuple[bool, Dict]:
    """
    Process subscription payment for tenant signup.
    
    Args:
        tenant_id: Tenant ID
        package_id: Package ID
        amount: Payment amount
        currency: Currency code
        payment_data: Payment form data (card details, etc.)
        billing_cycle: 'monthly' or 'yearly'
    
    Returns:
        Tuple of (success: bool, transaction_data: Dict)
    """
    gateway_name = payment_data.get('gateway', 'stripe')  # Default to stripe
    gateway = get_payment_gateway(gateway_name)
    
    description = f"Subscription signup - Tenant {tenant_id}, Package {package_id}"
    metadata = {
        'tenant_id': tenant_id,
        'package_id': package_id,
        'billing_cycle': billing_cycle,
        'type': 'subscription_signup',
    }
    
    # Extract payment method ID from payment_data
    # In a real implementation, the frontend would create a payment method/token
    # and send the token ID instead of raw card details
    payment_method_id = payment_data.get('payment_method_id') or payment_data.get('token')
    
    if not payment_method_id:
        # For now, we'll use mock payment if no token is provided
        # In production, frontend should create payment method via gateway SDK
        logger.warning("No payment method token provided. Using mock payment.")
        return gateway.process_payment(amount, currency, 'mock_token', description, metadata)
    
    return gateway.process_payment(amount, currency, payment_method_id, description, metadata)



