"""
Authentication and user management views.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from rest_framework import serializers
from .models import User
from .serializers import (
    UserSerializer, UserCreateSerializer, UserLoginSerializer,
    PasswordChangeSerializer, PINSetSerializer
)
from core.models import Tenant


class AuthViewSet(viewsets.ViewSet):
    """Authentication endpoints."""
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def register(self, request):
        """Register a new tenant and admin user."""
        # This would create tenant + user in one step
        # For now, simplified version
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def login(self, request):
        """User login."""
        serializer = UserLoginSerializer(data=request.data)
        if not serializer.is_valid():
            # Format serializer errors for better frontend handling
            errors = {}
            for field, error_list in serializer.errors.items():
                if isinstance(error_list, list):
                    errors[field] = error_list[0] if error_list else 'Invalid value'
                else:
                    errors[field] = str(error_list)
            return Response(
                {'error': errors.get('email') or errors.get('password') or 'Invalid input', 'errors': errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        tenant_slug = serializer.validated_data.get('tenant_slug', '').strip() or None
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check tenant if provided
        if tenant_slug and user.tenant:
            if user.tenant.slug != tenant_slug:
                return Response(
                    {'error': 'Invalid tenant.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
        # Authenticate
        user = authenticate(username=user.username, password=password)
        if user and user.is_active:
            user.last_login = timezone.now()
            user.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            })
        
        return Response(
            {'error': 'Invalid credentials.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        """Logout user."""
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Successfully logged out.'})
        except Exception:
            return Response(
                {'error': 'Invalid token.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user info."""
        return Response(UserSerializer(request.user).data)
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change user password."""
        serializer = PasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'error': 'Incorrect old password.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Password changed successfully.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def set_pin(self, request):
        """Set PIN for POS operations."""
        serializer = PINSetSerializer(data=request.data)
        if serializer.is_valid():
            request.user.pin = serializer.validated_data['pin']
            request.user.save()
            return Response({'message': 'PIN set successfully.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    """User management viewset."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter users by tenant - each tenant sees only their users."""
        queryset = User.objects.all()
        user = self.request.user
        
        # Super Admin can see all users (or filter by request.tenant if provided)
        if user.role == 'super_admin':
            if hasattr(self.request, 'tenant') and self.request.tenant:
                queryset = queryset.filter(tenant=self.request.tenant)
            # Otherwise, super_admin can see all users
            return queryset
        
        # Tenant Admin: Always filter by their tenant
        if user.role == 'tenant_admin':
            # Use user's tenant as primary source (most reliable)
            user_tenant = getattr(user, 'tenant', None)
            if user_tenant:
                # Tenant admin sees all users in their tenant except super_admin
                queryset = queryset.filter(tenant=user_tenant).exclude(role='super_admin')
            else:
                # Fallback: use request.tenant if available
                if hasattr(self.request, 'tenant') and self.request.tenant:
                    queryset = queryset.filter(tenant=self.request.tenant).exclude(role='super_admin')
                else:
                    queryset = queryset.none()
            return queryset
        
        # Other roles (supervisor, cashier, etc.): Filter by their tenant
        user_tenant = getattr(user, 'tenant', None)
        if user_tenant:
            queryset = queryset.filter(tenant=user_tenant).exclude(role='super_admin')
        elif hasattr(self.request, 'tenant') and self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant).exclude(role='super_admin')
        else:
            queryset = queryset.none()
            
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    def create(self, request, *args, **kwargs):
        """Create user with security checks."""
        user = request.user
        user_role = getattr(user, 'role', None)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Security: Tenant admin cannot create super_admin users
        role = serializer.validated_data.get('role')
        if user_role == 'tenant_admin' and role == 'super_admin':
            return Response(
                {'role': ['Tenant administrators cannot create Super Admin users. Super Admin is reserved for system owners only.']},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Determine tenant: Use creator's tenant as primary source
        tenant = None
        if user_role == 'tenant_admin':
            # Tenant admin creates users in their own tenant
            tenant = getattr(user, 'tenant', None)
            if not tenant:
                # Fallback to request.tenant
                tenant = getattr(request, 'tenant', None)
        elif user_role == 'super_admin':
            # Super admin can create users in any tenant (from request) or no tenant
            tenant = getattr(request, 'tenant', None)
        else:
            # Other roles create users in their tenant
            tenant = getattr(user, 'tenant', None) or getattr(request, 'tenant', None)
        
        # Security: Super Admin users must have tenant=None
        if role == 'super_admin':
            serializer.save(tenant=None)
        elif tenant:
            serializer.save(tenant=tenant)
        else:
            serializer.save()
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """Update user with security checks."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        user_role = getattr(request.user, 'role', None)
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Security: Tenant admin cannot update users to super_admin role
        new_role = serializer.validated_data.get('role', instance.role)
        if user_role == 'tenant_admin' and new_role == 'super_admin':
            return Response(
                {'role': ['Tenant administrators cannot assign Super Admin role. Super Admin is reserved for system owners only.']},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Security: Tenant admin can only update users in their tenant
        if user_role == 'tenant_admin':
            if instance.role == 'super_admin':
                return Response(
                    {'error': 'You cannot modify Super Admin users.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if hasattr(request, 'tenant') and request.tenant:
                if instance.tenant != request.tenant:
                    return Response(
                        {'error': 'You can only modify users in your own tenant.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        # Security: Super Admin users must have tenant=None
        if new_role == 'super_admin':
            serializer.save(tenant=None)
        else:
            serializer.save()
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Delete user with security checks."""
        instance = self.get_object()
        user_role = getattr(request.user, 'role', None)
        
        # Security: Tenant admin cannot delete super_admin users
        if user_role == 'tenant_admin':
            if instance.role == 'super_admin':
                return Response(
                    {'error': 'Tenant administrators cannot delete Super Admin users. Super Admin users are system owners and can only be managed by other Super Admins.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Security: Tenant admin can only delete users in their tenant
            if hasattr(request, 'tenant') and request.tenant:
                if instance.tenant != request.tenant:
                    return Response(
                        {'error': 'You can only delete users in your own tenant.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        # Security: Prevent users from deleting themselves
        if instance.id == request.user.id:
            return Response(
                {'error': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)

