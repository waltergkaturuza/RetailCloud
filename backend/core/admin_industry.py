"""
Admin registration for industry-specific models.
"""
from django.contrib import admin
from .industry_specific_models import (
    CategoryFieldDefinition,
    CategoryWorkflow,
    CategoryReportTemplate,
)


@admin.register(CategoryFieldDefinition)
class CategoryFieldDefinitionAdmin(admin.ModelAdmin):
    """Admin for category field definitions."""
    list_display = ['category', 'field_key', 'field_label', 'field_type', 'is_visible', 'is_required', 'section', 'sort_order']
    list_filter = ['category', 'field_type', 'is_visible', 'is_required', 'section']
    search_fields = ['field_key', 'field_label', 'category__name']
    ordering = ['category', 'section', 'sort_order']


@admin.register(CategoryWorkflow)
class CategoryWorkflowAdmin(admin.ModelAdmin):
    """Admin for category workflows."""
    list_display = ['category', 'name', 'workflow_type', 'is_active', 'priority']
    list_filter = ['category', 'workflow_type', 'is_active']
    search_fields = ['name', 'category__name']


@admin.register(CategoryReportTemplate)
class CategoryReportTemplateAdmin(admin.ModelAdmin):
    """Admin for category report templates."""
    list_display = ['category', 'name', 'report_type', 'is_default', 'is_active', 'sort_order']
    list_filter = ['category', 'report_type', 'is_default', 'is_active']
    search_fields = ['name', 'category__name']

