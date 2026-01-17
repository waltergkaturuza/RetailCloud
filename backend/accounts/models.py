"""
User account models with tenant association.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from core.models import Tenant, Branch


class User(AbstractUser):
    """Extended user model with tenant association."""
    # Override email field to make it unique and required
    email = models.EmailField(unique=True, verbose_name='email address')
    
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='users',
        null=True,
        blank=True
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff'
    )
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(
        max_length=50,
        choices=[
            ('super_admin', 'Super Admin'),
            ('tenant_admin', 'Tenant Admin'),
            ('supervisor', 'Supervisor'),
            ('cashier', 'Cashier'),
            ('stock_controller', 'Stock Controller'),
            ('accountant', 'Accountant'),
            ('auditor', 'Auditor'),
            ('manager', 'Manager'),
        ],
        default='cashier'
    )
    pin = models.CharField(
        max_length=4,
        blank=True,
        help_text="4-digit PIN for POS operations"
    )
    is_email_verified = models.BooleanField(default=False)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['email'], name='unique_user_email')
        ]
    
    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
    
    @property
    def has_pos_access(self):
        """Check if user can access POS."""
        return self.role in ['super_admin', 'tenant_admin', 'supervisor', 'cashier', 'manager']
    
    @property
    def can_edit_stock(self):
        """Check if user can edit inventory."""
        return self.role in ['super_admin', 'tenant_admin', 'supervisor', 'stock_controller', 'manager']
    
    @property
    def can_view_reports(self):
        """Check if user can view reports."""
        return self.role in ['super_admin', 'tenant_admin', 'supervisor', 'accountant', 'manager']


class UserPermission(models.Model):
    """Granular permissions for users."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='permissions')
    module = models.CharField(max_length=50, help_text="Module code")
    permission = models.CharField(max_length=50, help_text="Permission type: view, create, update, delete")
    granted = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'user_permissions'
        unique_together = [['user', 'module', 'permission']]
    
    def __str__(self):
        return f"{self.user.email} - {self.module}.{self.permission}"




