"""
Email verification models for user account verification.
"""
from django.db import models
from django.utils import timezone
from django.utils.crypto import get_random_string
from datetime import timedelta


class EmailVerificationToken(models.Model):
    """Email verification token for user email verification."""
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='email_verification_token'
    )
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)
    is_used = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'email_verification_tokens'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.token[:8]}..."
    
    @classmethod
    def generate_token(cls, user):
        """Generate a new verification token for a user."""
        # Delete any existing tokens for this user
        cls.objects.filter(user=user, is_used=False).delete()
        
        token = get_random_string(64)
        expires_at = timezone.now() + timedelta(hours=24)  # 24 hour expiry
        
        return cls.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )
    
    def is_valid(self):
        """Check if token is valid and not expired."""
        if self.is_used:
            return False
        if timezone.now() > self.expires_at:
            return False
        return True
    
    def verify(self):
        """Mark token as verified and update user."""
        if not self.is_valid():
            return False
        
        self.is_used = True
        self.verified_at = timezone.now()
        self.save()
        
        # Update user email verification status
        self.user.is_email_verified = True
        self.user.email_verified_at = timezone.now()
        self.user.save()
        
        return True



