"""
Serializers for Tenant Branding Settings.
"""
from rest_framework import serializers
from .models import Tenant


class TenantBrandingSerializer(serializers.ModelSerializer):
    """Serializer for tenant branding (logo and signatures)."""
    logo_url = serializers.SerializerMethodField()
    manager_signature_url = serializers.SerializerMethodField()
    approved_by_signature_url = serializers.SerializerMethodField()
    prepared_by_signature_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Tenant
        fields = [
            'logo', 'logo_url',
            'manager_signature', 'manager_signature_url',
            'approved_by_signature', 'approved_by_signature_url',
            'prepared_by_signature', 'prepared_by_signature_url',
        ]
        read_only_fields = ['logo_url', 'manager_signature_url', 'approved_by_signature_url', 'prepared_by_signature_url']
    
    def get_logo_url(self, obj):
        """Get logo URL if exists."""
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None
    
    def get_manager_signature_url(self, obj):
        """Get manager signature URL if exists."""
        if obj.manager_signature:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.manager_signature.url)
            return obj.manager_signature.url
        return None
    
    def get_approved_by_signature_url(self, obj):
        """Get approved by signature URL if exists."""
        if obj.approved_by_signature:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.approved_by_signature.url)
            return obj.approved_by_signature.url
        return None
    
    def get_prepared_by_signature_url(self, obj):
        """Get prepared by signature URL if exists."""
        if obj.prepared_by_signature:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.prepared_by_signature.url)
            return obj.prepared_by_signature.url
        return None

