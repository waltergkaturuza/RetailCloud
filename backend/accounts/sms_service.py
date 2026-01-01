"""
SMS Service for sending 2FA codes and notifications via SMS.
Supports multiple SMS providers: Twilio, AWS SNS, etc.
"""
import logging
import secrets
from typing import Optional
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


class SMSService:
    """Service for sending SMS messages via various providers."""
    
    @staticmethod
    def send_sms(to: str, message: str) -> tuple[bool, Optional[str]]:
        """
        Send SMS message to phone number.
        
        Args:
            to: Phone number in E.164 format (e.g., +1234567890)
            message: SMS message text
            
        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        provider = getattr(settings, 'SMS_PROVIDER', 'twilio').lower()
        
        if provider == 'twilio':
            return SMSService._send_via_twilio(to, message)
        elif provider == 'aws_sns':
            return SMSService._send_via_aws_sns(to, message)
        elif provider == 'console':
            # For development/testing - just log to console
            logger.info(f"SMS (console): To: {to}, Message: {message}")
            return True, None
        else:
            logger.error(f"Unknown SMS provider: {provider}")
            return False, f"Unknown SMS provider: {provider}"
    
    @staticmethod
    def _send_via_twilio(to: str, message: str) -> tuple[bool, Optional[str]]:
        """Send SMS via Twilio."""
        try:
            from twilio.rest import Client
            
            account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
            auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
            from_number = getattr(settings, 'TWILIO_PHONE_NUMBER', None)
            
            if not all([account_sid, auth_token, from_number]):
                logger.error("Twilio credentials not configured")
                return False, "SMS service not configured"
            
            client = Client(account_sid, auth_token)
            
            message_obj = client.messages.create(
                body=message,
                from_=from_number,
                to=to
            )
            
            logger.info(f"SMS sent via Twilio to {to}. SID: {message_obj.sid}")
            return True, None
            
        except ImportError:
            logger.error("twilio package not installed. Install with: pip install twilio")
            return False, "SMS service not available"
        except Exception as e:
            logger.error(f"Failed to send SMS via Twilio: {str(e)}", exc_info=True)
            return False, str(e)
    
    @staticmethod
    def _send_via_aws_sns(to: str, message: str) -> tuple[bool, Optional[str]]:
        """Send SMS via AWS SNS."""
        try:
            import boto3
            
            aws_access_key_id = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
            aws_secret_access_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
            aws_region = getattr(settings, 'AWS_REGION', 'us-east-1')
            
            if not all([aws_access_key_id, aws_secret_access_key]):
                logger.error("AWS credentials not configured")
                return False, "SMS service not configured"
            
            sns = boto3.client(
                'sns',
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key,
                region_name=aws_region
            )
            
            response = sns.publish(
                PhoneNumber=to,
                Message=message
            )
            
            logger.info(f"SMS sent via AWS SNS to {to}. MessageId: {response.get('MessageId')}")
            return True, None
            
        except ImportError:
            logger.error("boto3 package not installed. Install with: pip install boto3")
            return False, "SMS service not available"
        except Exception as e:
            logger.error(f"Failed to send SMS via AWS SNS: {str(e)}", exc_info=True)
            return False, str(e)
    
    @staticmethod
    def generate_2fa_code(length: int = 6) -> str:
        """Generate a random numeric 2FA code."""
        # Generate a random number with the specified length
        min_value = 10 ** (length - 1)
        max_value = (10 ** length) - 1
        code = secrets.randbelow(max_value - min_value + 1) + min_value
        return str(code).zfill(length)
    
    @staticmethod
    def send_2fa_code(phone_number: str, code: str) -> tuple[bool, Optional[str]]:
        """
        Send 2FA verification code via SMS.
        
        Args:
            phone_number: Phone number in E.164 format
            code: 2FA verification code
            
        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        message = f"Your RetailCloud verification code is: {code}. This code will expire in 10 minutes."
        return SMSService.send_sms(phone_number, message)
    
    @staticmethod
    def send_login_alert(phone_number: str, user_email: str, ip_address: str, device_info: str = "") -> tuple[bool, Optional[str]]:
        """Send login alert SMS."""
        message = f"New login to your RetailCloud account ({user_email}) from {ip_address}"
        if device_info:
            message += f" on {device_info}"
        message += ". If this wasn't you, please change your password immediately."
        return SMSService.send_sms(phone_number, message)

