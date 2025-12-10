"""
Recommendation API endpoints.
"""
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .recommendation_engine import RecommendationEngine
from core.utils import get_tenant_from_request


class RecommendationsView(views.APIView):
    """Get intelligent business recommendations."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Generate and return recommendations for the tenant."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {'error': 'No tenant found.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        include_low_priority = request.query_params.get('include_low_priority', 'false').lower() == 'true'
        
        try:
            engine = RecommendationEngine(tenant)
            recommendations = engine.generate_all_recommendations(
                include_low_priority=include_low_priority
            )
            return Response(recommendations)
        except Exception as e:
            return Response(
                {'error': f'Error generating recommendations: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

