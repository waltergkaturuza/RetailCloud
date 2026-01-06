"""
Serializers for User Agreement
"""
from rest_framework import serializers
from .user_agreement_models import UserAgreement


class UserAgreementSerializer(serializers.ModelSerializer):
    """Serializer for User Agreement."""
    has_accepted_all = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = UserAgreement
        fields = [
            'id', 'terms_accepted', 'privacy_accepted',
            'terms_version', 'privacy_version',
            'terms_accepted_at', 'privacy_accepted_at',
            'first_accepted_at', 'last_updated_at',
            'has_accepted_all'
        ]
        read_only_fields = [
            'id', 'terms_accepted_at', 'privacy_accepted_at',
            'first_accepted_at', 'last_updated_at'
        ]


class AcceptAgreementsSerializer(serializers.Serializer):
    """Serializer for accepting agreements."""
    accept_terms = serializers.BooleanField(required=True)
    accept_privacy = serializers.BooleanField(required=True)
    terms_version = serializers.CharField(required=False, allow_blank=True)
    privacy_version = serializers.CharField(required=False, allow_blank=True)

