"""
API views for email verification.
"""
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from accounts.models import User
from accounts.verification_models import EmailVerificationToken
from core.email_service import send_verification_email
import logging

logger = logging.getLogger(__name__)


class SendVerificationEmailView(views.APIView):
    """
    Send email verification email to user.
    Public endpoint - user doesn't need to be authenticated.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Send verification email.
        
        Expected payload:
        {
            "email": "user@example.com"
        }
        """
        email = request.data.get('email')
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal if email exists or not for security
            return Response(
                {'message': 'If an account exists with this email, a verification link has been sent.'},
                status=status.HTTP_200_OK
            )
        
        # Generate verification token
        verification_token = EmailVerificationToken.generate_token(user)
        
        # Send verification email
        email_sent = send_verification_email(
            user_email=user.email,
            verification_token=verification_token.token,
            username=user.username
        )
        
        if email_sent:
            return Response({
                'message': 'Verification email sent successfully. Please check your inbox.',
                'email': email  # For confirmation
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'Failed to send verification email. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VerifyEmailView(views.APIView):
    """
    Verify user email using verification token.
    Public endpoint.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """
        Verify email using token from query parameter.
        
        URL: /api/auth/verify-email/?token=<verification_token>
        """
        token = request.query_params.get('token')
        if not token:
            return Response(
                {'error': 'Verification token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            verification_token = EmailVerificationToken.objects.get(token=token, is_used=False)
        except EmailVerificationToken.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired verification token'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if token is still valid
        if not verification_token.is_valid():
            return Response(
                {'error': 'Verification token has expired. Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify the email
        if verification_token.verify():
            return Response({
                'message': 'Email verified successfully!',
                'email': verification_token.user.email,
                'username': verification_token.user.username
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'Failed to verify email. Token may be invalid or expired.'},
                status=status.HTTP_400_BAD_REQUEST
            )



