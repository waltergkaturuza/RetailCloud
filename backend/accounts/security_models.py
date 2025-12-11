"""
Security models for authentication, 2FA, password policies, and security features.
"""
from django.db import models
from django.utils import timezone
from django.core.validators import MinLengthValidator, RegexValidator
from django.contrib.auth.hashers import make_password
from django.conf import settings
from core.models import Tenant
import secrets
try:
    import pyotp
    import qrcode
    import io
    import base64
    HAS_SECURITY_LIBS = True
except ImportError:
    HAS_SECURITY_LIBS = False


class PasswordPolicy(models.Model):
    """Password policy configuration per tenant or system-wide."""
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='password_policies',
        null=True,
        blank=True,
        help_text="Null for system-wide policy"
    )
    
    # Complexity requirements
    min_length = models.IntegerField(default=8)
    require_uppercase = models.BooleanField(default=True)
    require_lowercase = models.BooleanField(default=True)
    require_digits = models.BooleanField(default=True)
    require_special_chars = models.BooleanField(default=True)
    special_chars = models.CharField(
        max_length=50,
        default='!@#$%^&*()_+-=[]{}|;:,.<>?',
        help_text="Allowed special characters"
    )
    
    # Expiration
    password_expiry_days = models.IntegerField(
        null=True,
        blank=True,
        help_text="Password expires after N days. Null = no expiration"
    )
    password_history_count = models.IntegerField(
        default=5,
        help_text="Number of previous passwords to remember"
    )
    
    # Account lockout
    max_login_attempts = models.IntegerField(
        default=5,
        help_text="Maximum failed login attempts before lockout"
    )
    lockout_duration_minutes = models.IntegerField(
        default=30,
        help_text="Account lockout duration in minutes"
    )
    
    # Session management
    session_timeout_minutes = models.IntegerField(
        default=480,  # 8 hours
        help_text="Session timeout in minutes"
    )
    max_concurrent_sessions = models.IntegerField(
        default=5,
        help_text="Maximum concurrent sessions per user"
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'password_policies'
        verbose_name_plural = 'Password Policies'
        unique_together = [['tenant']]  # One policy per tenant
    
    def __str__(self):
        if self.tenant:
            return f"Password Policy - {self.tenant.company_name}"
        return "System-Wide Password Policy"
    
    def validate_password(self, password):
        """Validate password against policy."""
        errors = []
        
        if len(password) < self.min_length:
            errors.append(f"Password must be at least {self.min_length} characters long.")
        
        if self.require_uppercase and not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter.")
        
        if self.require_lowercase and not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter.")
        
        if self.require_digits and not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one digit.")
        
        if self.require_special_chars:
            if not any(c in self.special_chars for c in password):
                errors.append(f"Password must contain at least one special character ({self.special_chars}).")
        
        return errors


class TwoFactorAuth(models.Model):
    """Two-Factor Authentication settings for users."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='two_factor_auth'
    )
    
    # TOTP (Time-based One-Time Password) - Authenticator apps
    is_enabled = models.BooleanField(default=False)
    secret_key = models.CharField(
        max_length=32,
        blank=True,
        help_text="TOTP secret key (base32 encoded)"
    )
    backup_codes = models.JSONField(
        default=list,
        blank=True,
        help_text="Backup codes for account recovery"
    )
    
    # SMS 2FA (optional, requires SMS gateway)
    sms_enabled = models.BooleanField(default=False)
    phone_number = models.CharField(max_length=20, blank=True)
    
    # Recovery
    recovery_email = models.EmailField(blank=True)
    
    # Metadata
    enabled_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'two_factor_auth'
        verbose_name = 'Two-Factor Authentication'
        verbose_name_plural = 'Two-Factor Authentications'
    
    def __str__(self):
        return f"2FA - {self.user.email} ({'Enabled' if self.is_enabled else 'Disabled'})"
    
    def generate_secret(self):
        """Generate a new TOTP secret key."""
        self.secret_key = pyotp.random_base32()
        return self.secret_key
    
    def get_totp_uri(self, issuer_name="RetailCloud"):
        """Get TOTP URI for QR code generation."""
        if not self.secret_key:
            self.generate_secret()
            self.save()
        
        totp = pyotp.TOTP(self.secret_key)
        return totp.provisioning_uri(
            name=self.user.email,
            issuer_name=issuer_name
        )
    
    def generate_qr_code(self, issuer_name="RetailCloud"):
        """Generate QR code image for authenticator app setup."""
        uri = self.get_totp_uri(issuer_name)
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return base64.b64encode(buffer.read()).decode()
    
    def verify_totp(self, token):
        """Verify TOTP token."""
        if not self.is_enabled or not self.secret_key:
            return False
        
        totp = pyotp.TOTP(self.secret_key)
        return totp.verify(token, valid_window=1)  # Allow 1 time step tolerance
    
    def generate_backup_codes(self, count=10):
        """Generate backup codes for account recovery."""
        codes = [secrets.token_hex(4).upper() for _ in range(count)]
        self.backup_codes = codes
        self.save()
        return codes
    
    def verify_backup_code(self, code):
        """Verify and consume a backup code."""
        if code.upper() in self.backup_codes:
            self.backup_codes.remove(code.upper())
            self.save()
            return True
        return False


class LoginAttempt(models.Model):
    """Track login attempts for brute force protection."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='login_attempts',
        null=True,
        blank=True,
        help_text="Null if username doesn't exist"
    )
    username = models.CharField(max_length=150, db_index=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    success = models.BooleanField(default=False)
    failure_reason = models.CharField(
        max_length=100,
        blank=True,
        help_text="Reason for failure: wrong_password, account_locked, 2fa_failed, etc."
    )
    attempted_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'login_attempts'
        ordering = ['-attempted_at']
        indexes = [
            models.Index(fields=['username', 'attempted_at']),
            models.Index(fields=['ip_address', 'attempted_at']),
        ]
    
    def __str__(self):
        status = "Success" if self.success else f"Failed: {self.failure_reason}"
        return f"{self.username} - {status} - {self.attempted_at}"


class UserSession(models.Model):
    """Track user sessions for session management."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    session_key = models.CharField(max_length=40, unique=True, db_index=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    device_name = models.CharField(max_length=100, blank=True)
    device_type = models.CharField(
        max_length=20,
        choices=[
            ('desktop', 'Desktop'),
            ('mobile', 'Mobile'),
            ('tablet', 'Tablet'),
            ('unknown', 'Unknown'),
        ],
        default='unknown'
    )
    browser = models.CharField(max_length=50, blank=True)
    os = models.CharField(max_length=50, blank=True)
    location = models.CharField(max_length=100, blank=True, help_text="City, Country")
    is_active = models.BooleanField(default=True)
    last_activity = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'user_sessions'
        ordering = ['-last_activity']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['session_key']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.device_name} - {self.created_at}"
    
    def is_expired(self):
        """Check if session is expired."""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False


class IPWhitelist(models.Model):
    """IP whitelist/blacklist per tenant."""
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='ip_whitelists'
    )
    ip_address = models.GenericIPAddressField()
    ip_range = models.CharField(
        max_length=50,
        blank=True,
        help_text="CIDR notation: 192.168.1.0/24"
    )
    is_whitelist = models.BooleanField(
        default=True,
        help_text="True for whitelist, False for blacklist"
    )
    description = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_ip_rules'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ip_whitelists'
        verbose_name = 'IP Whitelist/Blacklist'
        verbose_name_plural = 'IP Whitelists/Blacklists'
        unique_together = [['tenant', 'ip_address']]
        indexes = [
            models.Index(fields=['tenant', 'is_active']),
            models.Index(fields=['ip_address']),
        ]
    
    def __str__(self):
        rule_type = "Whitelist" if self.is_whitelist else "Blacklist"
        return f"{self.tenant.company_name} - {rule_type} - {self.ip_address}"
    
    def matches_ip(self, ip_address):
        """Check if IP address matches this rule."""
        import ipaddress
        
        try:
            if self.ip_range:
                # Check CIDR range
                network = ipaddress.ip_network(self.ip_range, strict=False)
                return ipaddress.ip_address(ip_address) in network
            else:
                # Exact match
                return str(self.ip_address) == str(ip_address)
        except (ValueError, ipaddress.AddressValueError):
            return False


class PasswordHistory(models.Model):
    """Store password history to prevent reuse."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='password_history'
    )
    password_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'password_history'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.created_at}"


class SecurityEvent(models.Model):
    """Security audit trail for security-related events."""
    EVENT_TYPES = [
        ('login_success', 'Login Success'),
        ('login_failed', 'Login Failed'),
        ('login_locked', 'Account Locked'),
        ('password_changed', 'Password Changed'),
        ('password_reset', 'Password Reset'),
        ('2fa_enabled', '2FA Enabled'),
        ('2fa_disabled', '2FA Disabled'),
        ('2fa_verified', '2FA Verified'),
        ('2fa_failed', '2FA Failed'),
        ('session_created', 'Session Created'),
        ('session_terminated', 'Session Terminated'),
        ('ip_blocked', 'IP Blocked'),
        ('suspicious_activity', 'Suspicious Activity'),
        ('account_suspended', 'Account Suspended'),
        ('account_unsuspended', 'Account Unsuspended'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='security_events'
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.SET_NULL,
        null=True,
        related_name='security_events'
    )
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    severity = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Low'),
            ('medium', 'Medium'),
            ('high', 'High'),
            ('critical', 'Critical'),
        ],
        default='medium'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'security_events'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['tenant', 'created_at']),
            models.Index(fields=['event_type', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_event_type_display()} - {self.user.email if self.user else 'System'} - {self.created_at}"

