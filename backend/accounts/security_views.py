"""
Security views for 2FA, password policies, sessions, and security management.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.sessions.models import Session
from django.contrib.sessions.backends.db import SessionStore
from django.core.cache import cache

from .models import User
from .security_models import (
    PasswordPolicy, TwoFactorAuth, UserSession, IPWhitelist,
    SecurityEvent
)
from .security_serializers import (
    PasswordPolicySerializer, TwoFactorAuthSerializer,
    TwoFactorSetupSerializer, TwoFactorVerifySerializer,
    UserSessionSerializer, IPWhitelistSerializer,
    SecurityEventSerializer, PasswordChangeWithPolicySerializer
)
from .security_service import SecurityService
from .email_notifications import SecurityEmailService, PasswordExpirationService
from core.models import Tenant
from core.utils import get_tenant_from_request
from core.owner_permissions import IsSuperAdmin


class PasswordPolicyViewSet(viewsets.ModelViewSet):
    """Manage password policies."""
    queryset = PasswordPolicy.objects.all()
    serializer_class = PasswordPolicySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant or show system-wide."""
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.role == 'super_admin':
            return queryset
        
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return queryset.filter(tenant=tenant) | queryset.filter(tenant=None)
        
        return queryset.filter(tenant=None)
    
    def get_permissions(self):
        """Only super_admin and tenant_admin can manage policies."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsSuperAdmin()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current password policy for user's tenant."""
        tenant = get_tenant_from_request(request)
        policy = SecurityService.get_password_policy(tenant)
        serializer = self.get_serializer(policy)
        return Response(serializer.data)


class TwoFactorAuthViewSet(viewsets.ModelViewSet):
    """Manage Two-Factor Authentication."""
    queryset = TwoFactorAuth.objects.all()
    serializer_class = TwoFactorAuthSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own 2FA settings."""
        queryset = super().get_queryset()
        if self.request.user.role == 'super_admin':
            return queryset
        return queryset.filter(user=self.request.user)
    
    def get_object(self):
        """Get or create 2FA for current user."""
        two_fa, created = TwoFactorAuth.objects.get_or_create(
            user=self.request.user
        )
        return two_fa
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get 2FA status for current user."""
        two_fa, created = TwoFactorAuth.objects.get_or_create(
            user=request.user
        )
        serializer = self.get_serializer(two_fa)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def setup(self, request):
        """Setup 2FA - generate secret and QR code."""
        two_fa, created = TwoFactorAuth.objects.get_or_create(
            user=request.user
        )
        
        if two_fa.is_enabled:
            return Response(
                {'error': '2FA is already enabled. Disable it first to change settings.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate secret
        two_fa.generate_secret()
        two_fa.save()
        
        serializer = self.get_serializer(two_fa)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def verify_setup(self, request):
        """Verify 2FA setup with TOTP token."""
        serializer = TwoFactorSetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        two_fa, created = TwoFactorAuth.objects.get_or_create(
            user=request.user
        )
        
        if not two_fa.secret_key:
            return Response(
                {'error': '2FA not initialized. Call /setup first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        token = serializer.validated_data['totp_token']
        if two_fa.verify_totp(token):
            two_fa.is_enabled = True
            two_fa.enabled_at = timezone.now()
            two_fa.generate_backup_codes()
            two_fa.save()
            
            from .security_models import SecurityEvent
            SecurityEvent.objects.create(
                user=request.user,
                tenant=request.user.tenant,
                event_type='2fa_enabled',
                ip_address=self._get_client_ip(request),
                description="2FA enabled successfully",
                severity='medium',
            )
            
            # Send email notification
            try:
                SecurityEmailService.send_2fa_enabled_notification(request.user)
            except Exception as e:
                logger.error(f"Failed to send 2FA enabled email: {str(e)}", exc_info=True)
            
            return Response({
                'message': '2FA enabled successfully.',
                'backup_codes': two_fa.backup_codes,
                'warning': 'Save these backup codes in a secure location. They will not be shown again.'
            })
        
        return Response(
            {'error': 'Invalid TOTP code. Please try again.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['post'])
    def disable(self, request):
        """Disable 2FA (requires password confirmation)."""
        password = request.data.get('password')
        if not password or not request.user.check_password(password):
            return Response(
                {'error': 'Password required to disable 2FA.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        two_fa, created = TwoFactorAuth.objects.get_or_create(
            user=request.user
        )
        
        two_fa.is_enabled = False
        two_fa.secret_key = ''
        two_fa.backup_codes = []
        two_fa.save()
        
        from .security_models import SecurityEvent
        SecurityEvent.objects.create(
            user=request.user,
            tenant=request.user.tenant,
            event_type='2fa_disabled',
            ip_address=self._get_client_ip(request),
            description="2FA disabled",
            severity='medium',
        )
        
        return Response({'message': '2FA disabled successfully.'})
    
    @action(detail=False, methods=['post'])
    def regenerate_backup_codes(self, request):
        """Regenerate backup codes."""
        password = request.data.get('password')
        if not password or not request.user.check_password(password):
            return Response(
                {'error': 'Password required to regenerate backup codes.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        two_fa, created = TwoFactorAuth.objects.get_or_create(
            user=request.user
        )
        
        if not two_fa.is_enabled:
            return Response(
                {'error': '2FA is not enabled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        codes = two_fa.generate_backup_codes()
        return Response({
            'backup_codes': codes,
            'message': 'Backup codes regenerated. Save them securely.'
        })
    
    def _get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class UserSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """Manage user sessions."""
    queryset = UserSession.objects.all()
    serializer_class = UserSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own sessions."""
        queryset = super().get_queryset()
        if self.request.user.role == 'super_admin':
            return queryset
        return queryset.filter(user=self.request.user, is_active=True)
    
    @action(detail=True, methods=['post'])
    def terminate(self, request, pk=None):
        """Terminate a specific session."""
        session = self.get_object()
        
        if session.user != request.user and request.user.role != 'super_admin':
            return Response(
                {'error': 'You can only terminate your own sessions.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        session.is_active = False
        session.save()
        
        # Delete Django session
        try:
            Session.objects.filter(session_key=session.session_key).delete()
        except Exception:
            pass
        
        SecurityEvent.objects.create(
            user=session.user,
            tenant=session.user.tenant,
            event_type='session_terminated',
            ip_address=self._get_client_ip(request),
            description=f"Session terminated: {session.device_name}",
            severity='low',
            metadata={'session_key': session.session_key}
        )
        
        return Response({'message': 'Session terminated successfully.'})
    
    @action(detail=False, methods=['post'])
    def terminate_all(self, request):
        """Terminate all other sessions (keep current)."""
        current_session_key = request.session.session_key
        
        sessions = UserSession.objects.filter(
            user=request.user,
            is_active=True
        ).exclude(session_key=current_session_key)
        
        terminated_count = 0
        for session in sessions:
            session.is_active = False
            session.save()
            
            try:
                from django.contrib.sessions.models import Session
                Session.objects.filter(session_key=session.session_key).delete()
            except Exception:
                pass
            
            terminated_count += 1
        
        SecurityEvent.objects.create(
            user=request.user,
            tenant=request.user.tenant,
            event_type='session_terminated',
            ip_address=self._get_client_ip(request),
            description=f"All other sessions terminated ({terminated_count} sessions)",
            severity='low',
        )
        
        return Response({
            'message': f'Terminated {terminated_count} session(s).',
            'terminated_count': terminated_count
        })
    
    def _get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class IPWhitelistViewSet(viewsets.ModelViewSet):
    """Manage IP whitelist/blacklist."""
    queryset = IPWhitelist.objects.all()
    serializer_class = IPWhitelistSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by tenant."""
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.role == 'super_admin':
            return queryset
        
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return queryset.filter(tenant=tenant)
        
        return queryset.none()
    
    def perform_create(self, serializer):
        """Set tenant and created_by automatically."""
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Tenant is required.")
        
        serializer.save(tenant=tenant, created_by=self.request.user)
    
    def get_permissions(self):
        """Only tenant_admin and super_admin can manage IP rules."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Allow tenant_admin, manager, and super_admin
            class IsTenantAdminOrManagerOrSuperAdmin(permissions.BasePermission):
                def has_permission(self, request, view):
                    if not request.user.is_authenticated:
                        return False
                    return request.user.role in ['super_admin', 'tenant_admin', 'manager']
            return [permissions.IsAuthenticated(), IsTenantAdminOrManagerOrSuperAdmin()]
        return [permissions.IsAuthenticated()]


class SecurityEventViewSet(viewsets.ReadOnlyModelViewSet):
    """View security events (audit trail)."""
    queryset = SecurityEvent.objects.all()
    serializer_class = SecurityEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter by user/tenant."""
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.role == 'super_admin':
            return queryset
        
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return queryset.filter(tenant=tenant)
        
        return queryset.filter(user=user)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent security events."""
        queryset = self.get_queryset()[:50]  # Last 50 events
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class PasswordExpirationViewSet(viewsets.ViewSet):
    """ViewSet for password expiration checks."""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get password expiration status for current user."""
        from .email_notifications import PasswordExpirationService
        user = request.user
        is_expired, days_remaining = PasswordExpirationService.check_password_expiration(user)
        
        return Response({
            'is_expired': is_expired,
            'days_remaining': days_remaining,
            'requires_change': is_expired,
        })

