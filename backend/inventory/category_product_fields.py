"""
Category-specific product fields model for storing industry-specific data.
"""
from django.db import models
import json
from inventory.models import Product
from core.models import Tenant


class ProductCustomField(models.Model):
    """Store category-specific custom fields for products."""
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name='custom_fields'
    )
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='product_custom_fields')
    
    # Store all category-specific fields as JSON (stored as text for SQLite compatibility)
    # Structure: {'field_key': 'value', ...}
    # e.g., {'expiry_date': '2025-12-31', 'batch_number': 'BATCH001', 'vehicle_make': 'Toyota'}
    field_data = models.TextField(
        default='{}',
        blank=True,
        help_text="Category-specific field values stored as JSON string"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'product_custom_fields'
        indexes = [
            models.Index(fields=['tenant', 'product']),
        ]
    
    def __str__(self):
        return f"Custom fields for {self.product.name}"
    
    def get_field_data(self):
        """Get field_data as dict."""
        try:
            return json.loads(self.field_data) if self.field_data else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def set_field_data(self, data):
        """Set field_data from dict."""
        self.field_data = json.dumps(data) if data else '{}'
    
    def get_field_value(self, field_key: str):
        """Get value for a specific custom field."""
        data = self.get_field_data()
        return data.get(field_key)
    
    def set_field_value(self, field_key: str, value):
        """Set value for a specific custom field."""
        data = self.get_field_data()
        data[field_key] = value
        self.set_field_data(data)
        self.save()

