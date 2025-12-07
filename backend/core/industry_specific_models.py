"""
Industry-specific field configurations and customizations.
"""
from django.db import models
from django.core.validators import MinValueValidator
import json


class CategoryFieldDefinition(models.Model):
    """Define which fields are visible/required for a specific business category."""
    
    FIELD_TYPES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('decimal', 'Decimal'),
        ('boolean', 'Boolean'),
        ('date', 'Date'),
        ('datetime', 'DateTime'),
        ('select', 'Select/Dropdown'),
        ('multiselect', 'Multi-Select'),
        ('textarea', 'Textarea'),
        ('file', 'File Upload'),
        ('json', 'JSON/Object'),
    ]
    
    category = models.ForeignKey(
        'BusinessCategory',
        on_delete=models.CASCADE,
        related_name='field_definitions'
    )
    field_key = models.CharField(max_length=100, help_text="Internal field identifier")
    field_label = models.CharField(max_length=255, help_text="Display label")
    field_type = models.CharField(max_length=20, choices=FIELD_TYPES, default='text')
    
    # Visibility and requirements
    is_visible = models.BooleanField(default=True, help_text="Show this field in forms")
    is_required = models.BooleanField(default=False, help_text="Field is required")
    is_searchable = models.BooleanField(default=False, help_text="Include in search")
    
    # Field configuration
    default_value = models.TextField(blank=True, help_text="Default value (JSON encoded if complex)")
    placeholder = models.CharField(max_length=255, blank=True)
    help_text = models.TextField(blank=True, help_text="Help text to display")
    
    # For select/multiselect fields
    options = models.TextField(
        default='{}',
        blank=True,
        help_text="Options for select/multiselect as JSON: {'choices': [{'value': 'x', 'label': 'X'}]}"
    )
    
    def get_options(self):
        """Get options as dict."""
        try:
            return json.loads(self.options) if self.options else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def set_options(self, value):
        """Set options from dict."""
        self.options = json.dumps(value) if value else '{}'
    
    # Validation
    min_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    min_length = models.IntegerField(null=True, blank=True)
    max_length = models.IntegerField(null=True, blank=True)
    pattern = models.CharField(max_length=255, blank=True, help_text="Regex pattern for validation")
    
    # Display
    section = models.CharField(max_length=100, default='general', help_text="Form section/tab")
    sort_order = models.IntegerField(default=0)
    width = models.CharField(max_length=20, default='full', help_text="Field width: full, half, third, quarter")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'category_field_definitions'
        unique_together = [['category', 'field_key']]
        ordering = ['section', 'sort_order', 'field_label']
    
    def __str__(self):
        return f"{self.category.name} - {self.field_label}"


class CategoryWorkflow(models.Model):
    """Define category-specific workflows and business rules."""
    
    category = models.ForeignKey(
        'BusinessCategory',
        on_delete=models.CASCADE,
        related_name='workflows'
    )
    name = models.CharField(max_length=255)
    workflow_type = models.CharField(
        max_length=50,
        choices=[
            ('product_creation', 'Product Creation'),
            ('sale_processing', 'Sale Processing'),
            ('inventory_management', 'Inventory Management'),
            ('reporting', 'Reporting'),
            ('custom', 'Custom Workflow'),
        ]
    )
    
    # Workflow configuration (JSON stored as text)
    config = models.TextField(
        default='{}',
        help_text="Workflow configuration in JSON format"
    )
    
    # Rules and conditions
    rules = models.TextField(
        default='[]',
        blank=True,
        help_text="Business rules as JSON: [{'condition': '...', 'action': '...'}]"
    )
    
    def get_config(self):
        """Get config as dict."""
        try:
            return json.loads(self.config) if self.config else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def set_config(self, value):
        """Set config from dict."""
        self.config = json.dumps(value) if value else '{}'
    
    def get_rules(self):
        """Get rules as list."""
        try:
            return json.loads(self.rules) if self.rules else []
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_rules(self, value):
        """Set rules from list."""
        self.rules = json.dumps(value) if value else '[]'
    
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=0)
    description = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'category_workflows'
        ordering = ['category', 'priority', 'name']
    
    def __str__(self):
        return f"{self.category.name} - {self.name}"


class CategoryReportTemplate(models.Model):
    """Category-specific report templates and analytics."""
    
    category = models.ForeignKey(
        'BusinessCategory',
        on_delete=models.CASCADE,
        related_name='report_templates'
    )
    name = models.CharField(max_length=255)
    report_type = models.CharField(
        max_length=50,
        choices=[
            ('sales', 'Sales Report'),
            ('inventory', 'Inventory Report'),
            ('profit', 'Profit & Loss'),
            ('custom', 'Custom Report'),
        ]
    )
    
    # Report configuration
    config = models.TextField(
        default='{}',
        help_text="Report configuration as JSON: columns, filters, charts, etc."
    )
    
    # Default view settings
    default_filters = models.TextField(default='{}', blank=True)
    chart_config = models.TextField(default='{}', blank=True)
    
    def get_config(self):
        """Get config as dict."""
        try:
            return json.loads(self.config) if self.config else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def set_config(self, value):
        """Set config from dict."""
        self.config = json.dumps(value) if value else '{}'
    
    def get_default_filters(self):
        """Get default filters as dict."""
        try:
            return json.loads(self.default_filters) if self.default_filters else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def get_chart_config(self):
        """Get chart config as dict."""
        try:
            return json.loads(self.chart_config) if self.chart_config else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    description = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'category_report_templates'
        ordering = ['category', 'sort_order', 'name']
    
    def __str__(self):
        return f"{self.category.name} - {self.name}"

