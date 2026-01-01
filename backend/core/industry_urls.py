"""
URLs for industry-specific configurations.
"""
from django.urls import path
from .industry_views import (
    CategoryFieldDefinitionsView,
    AllCategoryFieldsView,
    ProductCustomFieldsView,
    CategoryModulesView,
)

urlpatterns = [
    path('category-fields/', CategoryFieldDefinitionsView.as_view(), name='category-fields'),
    path('all-category-fields/', AllCategoryFieldsView.as_view(), name='all-category-fields'),
    path('products/<int:product_id>/custom-fields/', ProductCustomFieldsView.as_view(), name='product-custom-fields'),
    path('category-modules/', CategoryModulesView.as_view(), name='category-modules'),
]




