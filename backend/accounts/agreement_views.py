"""
Views for User Agreement acceptance
"""
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .user_agreement_models import UserAgreement
from .agreement_serializers import UserAgreementSerializer, AcceptAgreementsSerializer
from django.utils import timezone


class UserAgreementView(views.APIView):
    """View for checking and accepting user agreements."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's agreement status for current device."""
        device_fingerprint = self._get_device_fingerprint(request)
        agreement, created = UserAgreement.objects.get_or_create(
            user=request.user,
            device_fingerprint=device_fingerprint,
            defaults={
                'terms_accepted': False,
                'privacy_accepted': False,
            }
        )
        serializer = UserAgreementSerializer(agreement)
        return Response(serializer.data)
    
    def _get_device_fingerprint(self, request):
        """Generate a device fingerprint from user agent and other factors."""
        import hashlib
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        # Create a simple fingerprint from user agent
        # In production, you might want to include more factors like screen resolution, timezone, etc.
        fingerprint_string = f"{user_agent}"
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()[:64]
    
    def post(self, request):
        """Accept agreements."""
        serializer = AcceptAgreementsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        if not serializer.validated_data['accept_terms'] or not serializer.validated_data['accept_privacy']:
            return Response(
                {'error': 'You must accept both Terms and Conditions and Privacy Policy to continue.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get device fingerprint
        device_fingerprint = self._get_device_fingerprint(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Get or create agreement for this device
        agreement, created = UserAgreement.objects.get_or_create(
            user=request.user,
            device_fingerprint=device_fingerprint,
            defaults={
                'terms_accepted': False,
                'privacy_accepted': False,
            }
        )
        
        # Get IP address
        ip_address = None
        if hasattr(request, 'META'):
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')
        
        # Accept agreements
        terms_version = serializer.validated_data.get('terms_version', 'December 2024')
        privacy_version = serializer.validated_data.get('privacy_version', 'December 2024')
        
        agreement.accept_all(
            ip_address=ip_address,
            terms_version=terms_version,
            privacy_version=privacy_version,
            device_fingerprint=device_fingerprint,
            user_agent=user_agent
        )
        
        response_serializer = UserAgreementSerializer(agreement)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

