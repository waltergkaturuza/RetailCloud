"""
Debug endpoint to check user-tenant associations.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import User
from core.models import Tenant


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_user_tenant_info(request):
    """Debug endpoint to see user-tenant associations."""
    user = request.user
    
    # Get current user info
    user_info = {
        'id': user.id,
        'email': user.email,
        'username': user.username,
        'role': user.role,
        'tenant_id': user.tenant.id if user.tenant else None,
        'tenant_name': user.tenant.company_name if user.tenant else None,
    }
    
    # Get request tenant
    request_tenant = None
    if hasattr(request, 'tenant') and request.tenant:
        request_tenant = {
            'id': request.tenant.id,
            'name': request.tenant.company_name,
            'slug': request.tenant.slug,
        }
    
    # Get all users and their tenants
    all_users = User.objects.all().values('id', 'email', 'username', 'role', 'tenant_id')
    users_list = []
    for u in all_users:
        tenant = None
        if u['tenant_id']:
            try:
                tenant = Tenant.objects.get(id=u['tenant_id'])
                users_list.append({
                    'id': u['id'],
                    'email': u['email'],
                    'username': u['username'],
                    'role': u['role'],
                    'tenant_id': u['tenant_id'],
                    'tenant_name': tenant.company_name,
                })
            except Tenant.DoesNotExist:
                pass
        else:
            users_list.append({
                'id': u['id'],
                'email': u['email'],
                'username': u['username'],
                'role': u['role'],
                'tenant_id': None,
                'tenant_name': None,
            })
    
    # Filtered users (what tenant admin should see)
    filtered_users = []
    if user.role == 'tenant_admin' and user.tenant:
        filtered_users = User.objects.filter(tenant=user.tenant).exclude(role='super_admin').values(
            'id', 'email', 'username', 'role', 'tenant_id'
        )
    
    return Response({
        'current_user': user_info,
        'request_tenant': request_tenant,
        'all_users': users_list,
        'filtered_users_for_tenant_admin': list(filtered_users),
        'total_users': len(users_list),
        'users_without_tenant': [u for u in users_list if u['tenant_id'] is None],
    })

