"""
Views for industry-specific configurations and field definitions.
"""
from rest_framework import views, viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .business_category_models import BusinessCategory, CategoryModuleMapping
from .industry_specific_models import CategoryFieldDefinition, CategoryWorkflow, CategoryReportTemplate
from inventory.category_fields import get_category_fields, get_all_category_fields
from inventory.models import Product
from inventory.category_product_fields import ProductCustomField
import json


class CategoryFieldDefinitionsView(views.APIView):
    """Get field definitions for a specific business category."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get field definitions for tenant's business category."""
        tenant = getattr(request, 'tenant', None)
        if not tenant and request.user.is_authenticated and hasattr(request.user, 'tenant'):
            tenant = request.user.tenant
        
        if not tenant or not tenant.business_category:
            return Response(
                {'fields': []},
                status=status.HTTP_200_OK
            )
        
        category_code = tenant.business_category.code
        
        # Get fields from Python definitions
        python_fields = get_category_fields(category_code)
        
        # Also get from database definitions (if any)
        db_fields = CategoryFieldDefinition.objects.filter(
            category=tenant.business_category,
            is_visible=True
        ).order_by('section', 'sort_order')
        
        # Combine both sources (DB takes precedence)
        db_field_keys = {f.field_key for f in db_fields}
        all_fields = []
        
        # Add DB fields first
        for db_field in db_fields:
            all_fields.append({
                'key': db_field.field_key,
                'label': db_field.field_label,
                'type': db_field.field_type,
                'required': db_field.is_required,
                'section': db_field.section,
                'placeholder': db_field.placeholder,
                'help_text': db_field.help_text,
                'width': db_field.width,
                'options': db_field.get_options() if hasattr(db_field, 'get_options') else {},
            })
        
        # Add Python fields that aren't in DB
        for py_field in python_fields:
            if py_field.get('key') not in db_field_keys:
                all_fields.append({
                    'key': py_field.get('key'),
                    'label': py_field.get('label', py_field.get('key')),
                    'type': py_field.get('type', 'text'),
                    'required': py_field.get('required', False),
                    'section': py_field.get('section', 'general'),
                    'placeholder': py_field.get('placeholder', ''),
                    'help_text': py_field.get('help_text', ''),
                    'width': 'full',
                    'options': py_field.get('options', []),
                })
        
        # Group by section
        sections = {}
        for field in all_fields:
            section = field.get('section', 'general')
            if section not in sections:
                sections[section] = []
            sections[section].append(field)
        
        return Response({
            'category': category_code,
            'category_name': tenant.business_category.name,
            'sections': sections,
            'fields': all_fields,
        })


class AllCategoryFieldsView(views.APIView):
    """Get all category field definitions (for preview/admin)."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all category field definitions."""
        all_configs = get_all_category_fields()
        
        result = {}
        for category_code, fields in all_configs.items():
            # Group by section
            sections = {}
            for field in fields:
                section = field.get('section', 'general')
                if section not in sections:
                    sections[section] = []
                sections[section].append(field)
            result[category_code] = {
                'fields': fields,
                'sections': sections,
            }
        
        return Response(result)


class ProductCustomFieldsView(views.APIView):
    """Manage custom fields for a product."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, product_id):
        """Get custom fields for a product."""
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        product = get_object_or_404(Product, id=product_id, tenant=tenant)
        
        try:
            custom_fields = ProductCustomField.objects.get(product=product)
            return Response({
                'product_id': product.id,
                'fields': custom_fields.get_field_data(),
            })
        except ProductCustomField.DoesNotExist:
            return Response({
                'product_id': product.id,
                'fields': {},
            })
    
    def post(self, request, product_id):
        """Save custom fields for a product."""
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        product = get_object_or_404(Product, id=product_id, tenant=tenant)
        fields_data = request.data.get('fields', {})
        
        custom_fields, created = ProductCustomField.objects.get_or_create(
            product=product,
            defaults={'tenant': tenant, 'field_data': json.dumps(fields_data)}
        )
        
        if not created:
            custom_fields.set_field_data(fields_data)
            custom_fields.save()
        
        return Response({
            'product_id': product.id,
            'fields': custom_fields.get_field_data(),
            'message': 'Custom fields saved successfully',
        })


class CategoryModulesView(views.APIView):
    """Get recommended modules for a business category."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get recommended modules for tenant's business category."""
        tenant = getattr(request, 'tenant', None)
        if not tenant and request.user.is_authenticated and hasattr(request.user, 'tenant'):
            tenant = request.user.tenant
        
        if not tenant or not tenant.business_category:
            return Response({'modules': []})
        
        category = tenant.business_category
        
        # Get module mappings
        mappings = CategoryModuleMapping.objects.filter(
            category=category
        ).select_related('module').order_by('-priority', 'module__name')
        
        modules = []
        for mapping in mappings:
            modules.append({
                'id': mapping.module.id,
                'code': mapping.module.code,
                'name': mapping.module.name,
                'description': mapping.module.description,
                'is_required': mapping.is_required,
                'priority': mapping.priority,
                'notes': mapping.notes,
            })
        
        return Response({
            'category': category.code,
            'category_name': category.name,
            'modules': modules,
        })

