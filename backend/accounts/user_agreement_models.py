"""
User Agreement and Terms Acceptance Models
"""
from django.db import models
from django.utils import timezone
from .models import User


class UserAgreement(models.Model):
    """Track user acceptance of Terms and Conditions and Privacy Policy."""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='agreement',
        help_text="User who accepted the agreements"
    )
    
    # Acceptance flags
    terms_accepted = models.BooleanField(default=False, help_text="User accepted Terms and Conditions")
    privacy_accepted = models.BooleanField(default=False, help_text="User accepted Privacy Policy")
    
    # Version tracking
    terms_version = models.CharField(
        max_length=50,
        blank=True,
        help_text="Version of Terms and Conditions that was accepted"
    )
    privacy_version = models.CharField(
        max_length=50,
        blank=True,
        help_text="Version of Privacy Policy that was accepted"
    )
    
    # Timestamps
    terms_accepted_at = models.DateTimeField(null=True, blank=True, help_text="When Terms were accepted")
    privacy_accepted_at = models.DateTimeField(null=True, blank=True, help_text="When Privacy Policy was accepted")
    first_accepted_at = models.DateTimeField(auto_now_add=True, help_text="First time user accepted any agreement")
    last_updated_at = models.DateTimeField(auto_now=True, help_text="Last update timestamp")
    
    # IP Address tracking (for legal purposes)
    accepted_from_ip = models.GenericIPAddressField(null=True, blank=True, help_text="IP address when agreements were accepted")
    
    # Device/Browser tracking - to show terms on new devices
    device_fingerprint = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Device/browser fingerprint to track acceptance per device"
    )
    user_agent = models.TextField(
        blank=True,
        default='',
        help_text="User agent string when agreements were accepted"
    )
    
    class Meta:
        db_table = 'user_agreements'
        verbose_name = 'User Agreement'
        verbose_name_plural = 'User Agreements'
    
    def __str__(self):
        return f"{self.user.username} - Device: {self.device_fingerprint[:20] if self.device_fingerprint else 'N/A'}"
    
    def has_accepted_all(self):
        """Check if user has accepted both Terms and Privacy Policy."""
        return self.terms_accepted and self.privacy_accepted
    
    def accept_terms(self, ip_address=None, version=None):
        """Mark Terms as accepted."""
        self.terms_accepted = True
        self.terms_accepted_at = timezone.now()
        if version:
            self.terms_version = version
        if ip_address:
            self.accepted_from_ip = ip_address
        self.save()
    
    def accept_privacy(self, ip_address=None, version=None):
        """Mark Privacy Policy as accepted."""
        self.privacy_accepted = True
        self.privacy_accepted_at = timezone.now()
        if version:
            self.privacy_version = version
        if ip_address:
            self.accepted_from_ip = ip_address
        self.save()
    
    def accept_all(self, ip_address=None, terms_version=None, privacy_version=None, device_fingerprint=None, user_agent=None):
        """Accept both Terms and Privacy Policy."""
        self.accept_terms(ip_address, terms_version)
        self.accept_privacy(ip_address, privacy_version)
        if device_fingerprint:
            self.device_fingerprint = device_fingerprint
        if user_agent:
            self.user_agent = user_agent
        self.save()

