"""
SMS 2FA models for storing verification codes.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class SMSVerificationCode(models.Model):
    """Store SMS verification codes for 2FA."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sms_verification_codes'
    )
    phone_number = models.CharField(max_length=20, help_text="Phone number in E.164 format")
    code = models.CharField(max_length=10)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'sms_verification_codes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'code', 'is_used']),
            models.Index(fields=['phone_number', 'code', 'is_used']),
        ]
    
    def __str__(self):
        return f"SMS Code for {self.user.email} - {self.code} ({'used' if self.is_used else 'active'})"
    
    def is_valid(self) -> bool:
        """Check if code is still valid (not used and not expired)."""
        if self.is_used:
            return False
        if timezone.now() > self.expires_at:
            return False
        return True
    
    def verify(self, code: str) -> bool:
        """
        Verify the code.
        
        Args:
            code: The code to verify
            
        Returns:
            True if code is valid and matches, False otherwise
        """
        if not self.is_valid():
            return False
        
        if self.code != code:
            return False
        
        # Mark as used
        self.is_used = True
        self.verified_at = timezone.now()
        self.save()
        
        return True
    
    @classmethod
    def create_code(cls, user, phone_number: str, code_length: int = 6, expiry_minutes: int = 10) -> 'SMSVerificationCode':
        """
        Create a new SMS verification code.
        
        Args:
            user: User instance
            phone_number: Phone number in E.164 format
            code_length: Length of the code (default: 6)
            expiry_minutes: Minutes until code expires (default: 10)
            
        Returns:
            SMSVerificationCode instance
        """
        from .sms_service import SMSService
        
        # Generate code
        code = SMSService.generate_2fa_code(code_length)
        
        # Invalidate any existing unused codes for this user
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        
        # Create new code
        verification_code = cls.objects.create(
            user=user,
            phone_number=phone_number,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=expiry_minutes)
        )
        
        return verification_code

