"""
Serializers for branch management.
"""
from rest_framework import serializers
from .models import Branch


class BranchSerializer(serializers.ModelSerializer):
    """Complete branch serializer with all details."""
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)
    manager_email = serializers.EmailField(source='manager.email', read_only=True)
    staff_count = serializers.SerializerMethodField()
    full_address = serializers.CharField(source='get_full_address', read_only=True)
    
    class Meta:
        model = Branch
        fields = [
            'id', 'name', 'code',
            'address', 'city', 'country', 'postal_code',
            'phone', 'phone_alt', 'email', 'website',
            'description', 'opening_hours',
            'latitude', 'longitude',
            'manager', 'manager_name', 'manager_email', 'staff_count',
            'is_active', 'is_main', 'allow_online_orders',
            'full_address',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'staff_count']
    
    def get_staff_count(self, obj):
        """Get number of staff members assigned to this branch."""
        return obj.staff.count()
    
    def validate_code(self, value):
        """Validate branch code format."""
        if not value:
            raise serializers.ValidationError("Branch code is required.")
        # Ensure code is uppercase and alphanumeric with hyphens/underscores
        if not all(c.isalnum() or c in ['-', '_'] for c in value):
            raise serializers.ValidationError("Branch code can only contain letters, numbers, hyphens, and underscores.")
        return value.upper()
    
    def validate_opening_hours(self, value):
        """Validate opening hours JSON structure."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Opening hours must be a valid JSON object.")
        # Validate structure if provided
        valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        for day in value.keys():
            if day.lower() not in valid_days:
                raise serializers.ValidationError(f"Invalid day: {day}. Must be one of {valid_days}.")
        return value
    
    def create(self, validated_data):
        """Create branch with tenant assignment."""
        # Tenant is set automatically from request.tenant via perform_create
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Update branch with validation."""
        # If setting as main branch, ensure no other branch is main
        if validated_data.get('is_main') and not instance.is_main:
            Branch.objects.filter(
                tenant=instance.tenant,
                is_main=True
            ).exclude(pk=instance.pk).update(is_main=False)
        return super().update(instance, validated_data)


class BranchListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for branch lists."""
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)
    staff_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Branch
        fields = [
            'id', 'name', 'code', 'city', 'country',
            'phone', 'email', 'manager_name', 'staff_count',
            'is_active', 'is_main', 'created_at'
        ]
    
    def get_staff_count(self, obj):
        return obj.staff.count()




