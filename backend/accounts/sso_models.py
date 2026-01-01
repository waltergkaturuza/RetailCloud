"""
Single Sign-On (SSO) models for OAuth2, SAML, and LDAP integration.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from core.models import Tenant
import json


class SSOProvider(models.Model):
    """SSO Provider configuration (OAuth2, SAML, LDAP)."""
    PROVIDER_TYPES = [
        ('oauth2_google', 'OAuth2 - Google'),
        ('oauth2_microsoft', 'OAuth2 - Microsoft'),
        ('oauth2_github', 'OAuth2 - GitHub'),
        ('oauth2_custom', 'OAuth2 - Custom'),
        ('saml', 'SAML 2.0'),
        ('ldap', 'LDAP/Active Directory'),
    ]
    
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='sso_providers',
        null=True,
        blank=True,
        help_text="Null for system-wide provider"
    )
    
    provider_type = models.CharField(max_length=50, choices=PROVIDER_TYPES)
    name = models.CharField(max_length=255, help_text="Display name")
    is_active = models.BooleanField(default=True)
    
    # OAuth2 configuration
    client_id = models.CharField(max_length=255, blank=True)
    client_secret = models.CharField(max_length=255, blank=True)
    authorization_url = models.URLField(blank=True)
    token_url = models.URLField(blank=True)
    userinfo_url = models.URLField(blank=True)
    scope = models.CharField(max_length=500, blank=True, default="openid email profile")
    redirect_uri = models.URLField(blank=True)
    
    # SAML configuration
    saml_entity_id = models.CharField(max_length=255, blank=True)
    saml_sso_url = models.URLField(blank=True)
    saml_certificate = models.TextField(blank=True, help_text="X.509 certificate")
    saml_private_key = models.TextField(blank=True)
    
    # LDAP configuration
    ldap_server = models.CharField(max_length=255, blank=True)
    ldap_port = models.IntegerField(default=389)
    ldap_use_tls = models.BooleanField(default=False)
    ldap_base_dn = models.CharField(max_length=255, blank=True)
    ldap_bind_dn = models.CharField(max_length=255, blank=True)
    ldap_bind_password = models.CharField(max_length=255, blank=True)
    ldap_user_search = models.CharField(max_length=500, blank=True)
    
    # Additional configuration (JSON)
    extra_config = models.JSONField(default=dict, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_sso_providers'
    )
    
    class Meta:
        db_table = 'sso_providers'
        verbose_name = 'SSO Provider'
        verbose_name_plural = 'SSO Providers'
        unique_together = [['tenant', 'provider_type']]
    
    def __str__(self):
        return f"{self.name} ({self.get_provider_type_display()})"
    
    def get_config(self) -> dict:
        """Get provider configuration as dictionary."""
        config = {
            'provider_type': self.provider_type,
            'name': self.name,
            'is_active': self.is_active,
        }
        
        if self.provider_type.startswith('oauth2'):
            config.update({
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'authorization_url': self.authorization_url,
                'token_url': self.token_url,
                'userinfo_url': self.userinfo_url,
                'scope': self.scope,
                'redirect_uri': self.redirect_uri,
            })
        elif self.provider_type == 'saml':
            config.update({
                'entity_id': self.saml_entity_id,
                'sso_url': self.saml_sso_url,
                'certificate': self.saml_certificate,
                'private_key': self.saml_private_key,
            })
        elif self.provider_type == 'ldap':
            config.update({
                'server': self.ldap_server,
                'port': self.ldap_port,
                'use_tls': self.ldap_use_tls,
                'base_dn': self.ldap_base_dn,
                'bind_dn': self.ldap_bind_dn,
                'bind_password': self.ldap_bind_password,
                'user_search': self.ldap_user_search,
            })
        
        config.update(self.extra_config)
        return config


class SSOUserMapping(models.Model):
    """Map SSO user to local user account."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sso_mappings'
    )
    provider = models.ForeignKey(
        SSOProvider,
        on_delete=models.CASCADE,
        related_name='user_mappings'
    )
    external_id = models.CharField(
        max_length=255,
        help_text="User ID from SSO provider (sub, email, etc.)"
    )
    external_email = models.EmailField(blank=True)
    external_username = models.CharField(max_length=255, blank=True)
    
    # Additional attributes from SSO provider
    attributes = models.JSONField(default=dict, blank=True)
    
    # Metadata
    first_connected_at = models.DateTimeField(auto_now_add=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    login_count = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'sso_user_mappings'
        unique_together = [['provider', 'external_id']]
        indexes = [
            models.Index(fields=['provider', 'external_id']),
            models.Index(fields=['user']),
        ]
    
    def __str__(self):
        return f"{self.user.email} via {self.provider.name} ({self.external_id})"
    
    def record_login(self):
        """Record SSO login."""
        self.last_login_at = timezone.now()
        self.login_count += 1
        self.save(update_fields=['last_login_at', 'login_count'])

