"""
Security service for authentication, 2FA, password validation, and brute force protection.
"""
from django.contrib.auth import authenticate
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache
from datetime import timedelta
from typing import Tuple, Optional, Dict, Any
import logging

from .models import User
from .security_models import (
    PasswordPolicy, TwoFactorAuth, LoginAttempt, UserSession,
    IPWhitelist, PasswordHistory, SecurityEvent
)
from .email_notifications import SecurityEmailService, PasswordExpirationService
from core.models import Tenant
from core.utils import get_tenant_from_request

logger = logging.getLogger(__name__)


class SecurityService:
    """Service for security-related operations."""
    
    @staticmethod
    def get_password_policy(tenant: Optional[Tenant] = None) -> PasswordPolicy:
        """Get password policy for tenant or system-wide default."""
        if tenant:
            try:
                return PasswordPolicy.objects.get(tenant=tenant, is_active=True)
            except PasswordPolicy.DoesNotExist:
                pass
        
        # Get system-wide default
        try:
            return PasswordPolicy.objects.get(tenant=None, is_active=True)
        except PasswordPolicy.DoesNotExist:
            # Create default policy if none exists
            return PasswordPolicy.objects.create(
                tenant=None,
                min_length=8,
                require_uppercase=True,
                require_lowercase=True,
                require_digits=True,
                require_special_chars=True,
                max_login_attempts=5,
                lockout_duration_minutes=30,
                session_timeout_minutes=480,
                max_concurrent_sessions=5,
            )
    
    @staticmethod
    def validate_password(password: str, tenant: Optional[Tenant] = None, user: Optional[User] = None) -> Tuple[bool, list]:
        """Validate password against policy and history."""
        policy = SecurityService.get_password_policy(tenant)
        errors = policy.validate_password(password)
        
        # Check password history
        if user and policy.password_history_count > 0:
            recent_passwords = PasswordHistory.objects.filter(
                user=user
            ).order_by('-created_at')[:policy.password_history_count]
            
            from django.contrib.auth.hashers import check_password
            for old_password in recent_passwords:
                if check_password(password, old_password.password_hash):
                    errors.append("You cannot reuse a recently used password.")
                    break
        
        return len(errors) == 0, errors
    
    @staticmethod
    def save_password_to_history(user: User, password_hash: str):
        """Save password hash to history."""
        policy = SecurityService.get_password_policy(user.tenant)
        
        # Create password history entry
        PasswordHistory.objects.create(
            user=user,
            password_hash=password_hash
        )
        
        # Clean up old history beyond limit
        if policy.password_history_count > 0:
            old_passwords = PasswordHistory.objects.filter(
                user=user
            ).order_by('-created_at')[policy.password_history_count:]
            for old_pwd in old_passwords:
                old_pwd.delete()
    
    @staticmethod
    def check_brute_force_protection(username: str, ip_address: str) -> Tuple[bool, Optional[str]]:
        """
        Check if login should be blocked due to brute force attempts.
        
        Returns:
            Tuple of (is_allowed: bool, reason: Optional[str])
        """
        policy = SecurityService.get_password_policy()  # Use system-wide for now
        
        # Check by username
        recent_failures = LoginAttempt.objects.filter(
            username=username,
            success=False,
            attempted_at__gte=timezone.now() - timedelta(minutes=policy.lockout_duration_minutes)
        ).count()
        
        if recent_failures >= policy.max_login_attempts:
            # Check if user is locked
            user = None
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                try:
                    user = User.objects.get(email=username)
                except User.DoesNotExist:
                    pass
            
            if user:
                # Check if account is already locked
                lockout_key = f"account_locked_{user.id}"
                if cache.get(lockout_key):
                    return False, "Account is temporarily locked due to too many failed login attempts."
                
                # Lock account
                unlock_time = timezone.now() + timedelta(minutes=policy.lockout_duration_minutes)
                cache.set(lockout_key, True, timeout=policy.lockout_duration_minutes * 60)
                
                # Log security event
                SecurityEvent.objects.create(
                    user=user,
                    tenant=user.tenant,
                    event_type='login_locked',
                    ip_address=ip_address,
                    description=f"Account locked after {recent_failures} failed attempts",
                    severity='high',
                    metadata={'failed_attempts': recent_failures}
                )
                
                # Send email notification
                try:
                    from .email_notifications import SecurityEmailService
                    SecurityEmailService.send_account_locked_alert(user, ip_address, unlock_time)
                except Exception as e:
                    logger.error(f"Failed to send account locked email: {str(e)}", exc_info=True)
            
            return False, f"Too many failed login attempts. Account locked for {policy.lockout_duration_minutes} minutes."
        
        # Check by IP address (optional - can be more aggressive)
        ip_failures = LoginAttempt.objects.filter(
            ip_address=ip_address,
            success=False,
            attempted_at__gte=timezone.now() - timedelta(minutes=15)
        ).count()
        
        if ip_failures >= 10:  # 10 failures from same IP in 15 minutes
            return False, "Too many failed login attempts from this IP address. Please try again later."
        
        return True, None
    
    @staticmethod
    def check_ip_access(ip_address: str, tenant: Optional[Tenant] = None) -> Tuple[bool, Optional[str]]:
        """
        Check if IP address is allowed/blocked.
        
        Returns:
            Tuple of (is_allowed: bool, reason: Optional[str])
        """
        if not tenant:
            return True, None
        
        # Check blacklist first (more restrictive)
        blacklist = IPWhitelist.objects.filter(
            tenant=tenant,
            is_whitelist=False,
            is_active=True
        )
        
        for rule in blacklist:
            if rule.matches_ip(ip_address):
                SecurityEvent.objects.create(
                    tenant=tenant,
                    event_type='ip_blocked',
                    ip_address=ip_address,
                    description=f"IP {ip_address} blocked by blacklist rule",
                    severity='high',
                    metadata={'rule_id': rule.id}
                )
                return False, f"IP address {ip_address} is blocked."
        
        # Check whitelist (if tenant has whitelist enabled)
        whitelist = IPWhitelist.objects.filter(
            tenant=tenant,
            is_whitelist=True,
            is_active=True
        )
        
        if whitelist.exists():
            # If whitelist exists, IP must be in whitelist
            allowed = any(rule.matches_ip(ip_address) for rule in whitelist)
            if not allowed:
                SecurityEvent.objects.create(
                    tenant=tenant,
                    event_type='ip_blocked',
                    ip_address=ip_address,
                    description=f"IP {ip_address} not in whitelist",
                    severity='medium',
                )
                return False, f"IP address {ip_address} is not in the allowed list."
        
        return True, None
    
    @staticmethod
    def record_login_attempt(
        username: str,
        password: str,
        ip_address: str,
        user_agent: str,
        success: bool,
        failure_reason: str = "",
        user: Optional[User] = None
    ) -> LoginAttempt:
        """Record a login attempt."""
        attempt = LoginAttempt.objects.create(
            user=user,
            username=username,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            failure_reason=failure_reason
        )
        
        # Log security event
        if user:
            security_event = SecurityEvent.objects.create(
                user=user,
                tenant=user.tenant,
                event_type='login_success' if success else 'login_failed',
                ip_address=ip_address,
                user_agent=user_agent,
                description=f"Login {'successful' if success else 'failed'}: {failure_reason}" if not success else "Login successful",
                severity='low' if success else 'medium',
                metadata={'username': username, 'failure_reason': failure_reason} if not success else {}
            )
            
            # Send email notifications for failed login attempts (after 3 failures)
            if not success:
                recent_failures = LoginAttempt.objects.filter(
                    user=user,
                    success=False,
                    attempted_at__gte=timezone.now() - timedelta(minutes=30)
                ).count()
                
                # Send alert after 3 failed attempts
                if recent_failures >= 3:
                    try:
                        from .email_notifications import SecurityEmailService
                        SecurityEmailService.send_failed_login_alert(user, ip_address, recent_failures)
                    except Exception as e:
                        logger.error(f"Failed to send failed login alert email: {str(e)}", exc_info=True)
            
            # Send email for critical security events
            if security_event.severity in ['high', 'critical']:
                try:
                    from .email_notifications import SecurityEmailService
                    SecurityEmailService.send_security_event_alert(user, security_event)
                except Exception as e:
                    logger.error(f"Failed to send security event alert email: {str(e)}", exc_info=True)
        
        return attempt
    
    @staticmethod
    def create_user_session(
        user: User,
        session_key: str,
        ip_address: str,
        user_agent: str,
        request
    ) -> UserSession:
        """Create or update user session."""
        from user_agents import parse
        
        ua = parse(user_agent)
        device_type = 'unknown'
        if ua.is_mobile:
            device_type = 'mobile'
        elif ua.is_tablet:
            device_type = 'tablet'
        elif ua.is_pc:
            device_type = 'desktop'
        
        device_name = f"{ua.device.family} {ua.os.family} {ua.browser.family}".strip()
        
        # Get policy for session timeout
        policy = SecurityService.get_password_policy(user.tenant)
        expires_at = timezone.now() + timedelta(minutes=policy.session_timeout_minutes)
        
        # Check max concurrent sessions
        active_sessions = UserSession.objects.filter(
            user=user,
            is_active=True
        ).exclude(expires_at__lt=timezone.now())
        
        if active_sessions.count() >= policy.max_concurrent_sessions:
            # Terminate oldest session
            oldest_session = active_sessions.order_by('last_activity').first()
            if oldest_session:
                oldest_session.is_active = False
                oldest_session.save()
                
                SecurityEvent.objects.create(
                    user=user,
                    tenant=user.tenant,
                    event_type='session_terminated',
                    ip_address=ip_address,
                    description=f"Session terminated due to max concurrent sessions limit",
                    severity='low',
                    metadata={'session_key': oldest_session.session_key}
                )
        
        session, created = UserSession.objects.update_or_create(
            session_key=session_key,
            defaults={
                'user': user,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'device_name': device_name,
                'device_type': device_type,
                'browser': ua.browser.family,
                'os': ua.os.family,
                'is_active': True,
                'expires_at': expires_at,
                'last_activity': timezone.now(),
            }
        )
        
        if created:
            SecurityEvent.objects.create(
                user=user,
                tenant=user.tenant,
                event_type='session_created',
                ip_address=ip_address,
                description=f"New session created from {device_name}",
                severity='low',
                metadata={'session_key': session_key, 'device_type': device_type}
            )
        
        return session
    
    @staticmethod
    def authenticate_with_2fa(
        username: str,
        password: str,
        totp_token: Optional[str] = None,
        backup_code: Optional[str] = None,
        ip_address: str = "",
        user_agent: str = ""
    ) -> Tuple[Optional[User], bool, str]:
        """
        Authenticate user with optional 2FA.
        
        Returns:
            Tuple of (user: Optional[User], success: bool, message: str)
        """
        # First, authenticate with username/password
        user = authenticate(username=username, password=password)
        
        if not user:
            SecurityService.record_login_attempt(
                username=username,
                password="***",
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="invalid_credentials"
            )
            return None, False, "Invalid credentials."
        
        if not user.is_active:
            SecurityService.record_login_attempt(
                username=username,
                password="***",
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="account_inactive",
                user=user
            )
            return None, False, "Account is inactive."
        
        # Check if 2FA is enabled
        try:
            two_fa = user.two_factor_auth
            if two_fa.is_enabled:
                # Require 2FA token
                if not totp_token and not backup_code:
                    return user, False, "2FA_REQUIRED"  # Special flag for frontend
                
                verified = False
                if totp_token:
                    verified = two_fa.verify_totp(totp_token)
                    if verified:
                        two_fa.last_used_at = timezone.now()
                        two_fa.save()
                elif backup_code:
                    verified = two_fa.verify_backup_code(backup_code)
                    if verified:
                        two_fa.last_used_at = timezone.now()
                        two_fa.save()
                
                if not verified:
                    SecurityService.record_login_attempt(
                        username=username,
                        password="***",
                        ip_address=ip_address,
                        user_agent=user_agent,
                        success=False,
                        failure_reason="2fa_failed",
                        user=user
                    )
                    
                    SecurityEvent.objects.create(
                        user=user,
                        tenant=user.tenant,
                        event_type='2fa_failed',
                        ip_address=ip_address,
                        description="2FA verification failed",
                        severity='medium',
                    )
                    
                    return None, False, "Invalid 2FA code."
                
                SecurityEvent.objects.create(
                    user=user,
                    tenant=user.tenant,
                    event_type='2fa_verified',
                    ip_address=ip_address,
                    description="2FA verified successfully",
                    severity='low',
                )
        except TwoFactorAuth.DoesNotExist:
            # 2FA not set up, proceed normally
            pass
        
        # Check password expiration before allowing login
        from .email_notifications import PasswordExpirationService
        is_expired, days_remaining = PasswordExpirationService.check_password_expiration(user)
        if is_expired:
            SecurityService.record_login_attempt(
                username=username,
                password="***",
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="password_expired",
                user=user
            )
            return user, False, "PASSWORD_EXPIRED"  # Special flag for frontend
        
        # Record successful login
        SecurityService.record_login_attempt(
            username=username,
            password="***",
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
            user=user
        )
        
        # Check for new device/login from different location (simple check)
        # This is a basic implementation - you can enhance with device fingerprinting
        try:
            recent_sessions = UserSession.objects.filter(
                user=user,
                is_active=True
            ).exclude(ip_address=ip_address).order_by('-created_at')[:1]
            
            # If this is first session or IP is new, send notification
            if not recent_sessions.exists():
                # First login or new session - could be new device
                try:
                    from user_agents import parse
                    from .email_notifications import SecurityEmailService
                    ua = parse(user_agent)
                    device_name = f"{ua.device.family} {ua.os.family} {ua.browser.family}".strip()
                    SecurityEmailService.send_new_device_login(user, device_name, ip_address, "")
                except Exception:
                    pass  # Don't fail login if email fails
        except Exception:
            pass  # Don't fail login if device detection fails
        
        return user, True, "Authentication successful."

