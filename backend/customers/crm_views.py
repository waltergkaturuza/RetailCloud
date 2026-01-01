"""
Advanced CRM Views - API endpoints for segmentation, CLV, journey, loyalty.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.db.models import Q, Sum, Count, Avg
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from .models import Customer
from .crm_models import (
    CustomerSegment, CustomerSegmentMembership, CustomerRFMScore,
    CustomerLifetimeValue, CustomerTouchpoint, CustomerJourneyStage,
    LoyaltyTier, CustomerLoyaltyTier, LoyaltyReward, LoyaltyRedemption
)
from .crm_serializers import (
    CustomerSegmentSerializer, CustomerSegmentMembershipSerializer,
    CustomerRFMScoreSerializer, CustomerLifetimeValueSerializer,
    CustomerTouchpointSerializer, CustomerJourneyStageSerializer,
    LoyaltyTierSerializer, CustomerLoyaltyTierSerializer,
    LoyaltyRewardSerializer, LoyaltyRedemptionSerializer
)
from .crm_services import (
    RFMAnalysisService, CLVCalculationService,
    CustomerJourneyService, LoyaltyProgramService
)
from core.utils import get_tenant_from_request


class CustomerSegmentViewSet(viewsets.ModelViewSet):
    """Customer segment management."""
    serializer_class = CustomerSegmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['segment_type', 'is_active', 'auto_assign']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return CustomerSegment.objects.filter(tenant=tenant)
        return CustomerSegment.objects.none()
    
    def perform_create(self, serializer):
        tenant = get_tenant_from_request(self.request)
        serializer.save(tenant=tenant)
    
    @action(detail=True, methods=['post'])
    def assign_customers(self, request, pk=None):
        """Assign customers to this segment based on criteria."""
        segment = self.get_object()
        tenant = get_tenant_from_request(request)
        
        # Get customers matching segment criteria
        customers = Customer.objects.filter(tenant=tenant, is_active=True)
        
        assigned_count = 0
        for customer in customers:
            # Check if customer matches criteria
            if self._customer_matches_segment(customer, segment):
                CustomerSegmentMembership.objects.get_or_create(
                    customer=customer,
                    segment=segment
                )
                assigned_count += 1
        
        return Response({
            'message': f'Assigned {assigned_count} customers to segment',
            'assigned_count': assigned_count
        })
    
    def _customer_matches_segment(self, customer: Customer, segment: CustomerSegment) -> bool:
        """Check if customer matches segment criteria."""
        if segment.segment_type == 'rfm':
            try:
                rfm_score = customer.rfm_score
                r = rfm_score.recency_score
                f = rfm_score.frequency_score
                m = rfm_score.monetary_score
                
                if segment.rfm_recency_min and r < segment.rfm_recency_min:
                    return False
                if segment.rfm_recency_max and r > segment.rfm_recency_max:
                    return False
                if segment.rfm_frequency_min and f < segment.rfm_frequency_min:
                    return False
                if segment.rfm_frequency_max and f > segment.rfm_frequency_max:
                    return False
                if segment.rfm_monetary_min and m < segment.rfm_monetary_min:
                    return False
                if segment.rfm_monetary_max and m > segment.rfm_monetary_max:
                    return False
                
                return True
            except CustomerRFMScore.DoesNotExist:
                return False
        # Add other segment type matching logic
        return False


class CustomerSegmentMembershipViewSet(viewsets.ModelViewSet):
    """Customer segment membership management."""
    serializer_class = CustomerSegmentMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['segment', 'customer']
    ordering_fields = ['assigned_at']
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return CustomerSegmentMembership.objects.filter(
                customer__tenant=tenant
            ).select_related('customer', 'segment')
        return CustomerSegmentMembership.objects.none()


class CustomerRFMScoreViewSet(viewsets.ReadOnlyModelViewSet):
    """RFM score view (read-only)."""
    serializer_class = CustomerRFMScoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'rfm_score']
    search_fields = ['customer__first_name', 'customer__last_name', 'customer__phone']
    ordering_fields = ['rfm_score', 'monetary_value', 'calculated_at']
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return CustomerRFMScore.objects.filter(tenant=tenant).select_related('customer')
        return CustomerRFMScore.objects.none()
    
    @action(detail=False, methods=['post'])
    def calculate_all(self, request):
        """Calculate RFM scores for all customers."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get analysis period from request (default to last 365 days)
        days = int(request.data.get('days', 365))
        period_end = timezone.now().date()
        period_start = period_end - timedelta(days=days)
        
        service = RFMAnalysisService(tenant)
        result = service.calculate_rfm_for_all_customers(period_start, period_end)
        
        return Response(result)
    
    @action(detail=False, methods=['post'])
    def calculate_customer(self, request):
        """Calculate RFM score for a specific customer."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        customer_id = request.data.get('customer_id')
        if not customer_id:
            return Response({'error': 'customer_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            customer = Customer.objects.get(id=customer_id, tenant=tenant)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
        
        days = int(request.data.get('days', 365))
        period_end = timezone.now().date()
        period_start = period_end - timedelta(days=days)
        
        service = RFMAnalysisService(tenant)
        rfm_score = service.calculate_rfm_for_customer(customer, period_start, period_end)
        
        serializer = CustomerRFMScoreSerializer(rfm_score)
        return Response(serializer.data)


class CustomerLifetimeValueViewSet(viewsets.ReadOnlyModelViewSet):
    """Customer Lifetime Value view (read-only)."""
    serializer_class = CustomerLifetimeValueSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'calculation_date']
    search_fields = ['customer__first_name', 'customer__last_name', 'customer__phone']
    ordering_fields = ['historical_clv', 'predictive_clv', 'calculation_date']
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return CustomerLifetimeValue.objects.filter(tenant=tenant).select_related('customer')
        return CustomerLifetimeValue.objects.none()
    
    @action(detail=False, methods=['post'])
    def calculate_all(self, request):
        """Calculate CLV for all customers."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        period_end = request.data.get('period_end')
        period_start = request.data.get('period_start')
        
        if period_end:
            period_end = date.fromisoformat(period_end)
        if period_start:
            period_start = date.fromisoformat(period_start)
        
        service = CLVCalculationService(tenant)
        result = service.calculate_clv_for_all_customers(period_start, period_end)
        
        return Response(result)
    
    @action(detail=False, methods=['post'])
    def calculate_customer(self, request):
        """Calculate CLV for a specific customer."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        customer_id = request.data.get('customer_id')
        if not customer_id:
            return Response({'error': 'customer_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            customer = Customer.objects.get(id=customer_id, tenant=tenant)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
        
        period_end = request.data.get('period_end')
        period_start = request.data.get('period_start')
        
        if period_end:
            period_end = date.fromisoformat(period_end)
        if period_start:
            period_start = date.fromisoformat(period_start)
        
        service = CLVCalculationService(tenant)
        clv = service.calculate_clv_for_customer(customer, period_start, period_end)
        
        serializer = CustomerLifetimeValueSerializer(clv)
        return Response(serializer.data)


class CustomerTouchpointViewSet(viewsets.ModelViewSet):
    """Customer touchpoint management."""
    serializer_class = CustomerTouchpointSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'touchpoint_type', 'channel']
    search_fields = ['customer__first_name', 'customer__last_name', 'title', 'description']
    ordering_fields = ['interaction_date', 'created_at']
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return CustomerTouchpoint.objects.filter(tenant=tenant).select_related('customer', 'user')
        return CustomerTouchpoint.objects.none()
    
    def perform_create(self, serializer):
        tenant = get_tenant_from_request(self.request)
        serializer.save(tenant=tenant, user=self.request.user)


class CustomerJourneyStageViewSet(viewsets.ModelViewSet):
    """Customer journey stage management."""
    serializer_class = CustomerJourneyStageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['customer', 'stage', 'converted']
    ordering_fields = ['entered_at', 'exited_at']
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return CustomerJourneyStage.objects.filter(tenant=tenant).select_related('customer')
        return CustomerJourneyStage.objects.none()
    
    def perform_create(self, serializer):
        tenant = get_tenant_from_request(self.request)
        serializer.save(tenant=tenant)
    
    @action(detail=False, methods=['post'])
    def update_stage(self, request):
        """Update customer journey stage."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        customer_id = request.data.get('customer_id')
        new_stage = request.data.get('stage')
        engagement_score = request.data.get('engagement_score')
        converted = request.data.get('converted', False)
        
        if not customer_id or not new_stage:
            return Response({'error': 'customer_id and stage are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            customer = Customer.objects.get(id=customer_id, tenant=tenant)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
        
        service = CustomerJourneyService(tenant)
        stage = service.update_customer_journey_stage(customer, new_stage, engagement_score, converted)
        
        serializer = CustomerJourneyStageSerializer(stage)
        return Response(serializer.data)


class LoyaltyTierViewSet(viewsets.ModelViewSet):
    """Loyalty tier management."""
    serializer_class = LoyaltyTierSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['level', 'created_at']
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return LoyaltyTier.objects.filter(tenant=tenant)
        return LoyaltyTier.objects.none()
    
    def perform_create(self, serializer):
        tenant = get_tenant_from_request(self.request)
        serializer.save(tenant=tenant)


class CustomerLoyaltyTierViewSet(viewsets.ReadOnlyModelViewSet):
    """Customer loyalty tier membership view."""
    serializer_class = CustomerLoyaltyTierSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'tier']
    search_fields = ['customer__first_name', 'customer__last_name', 'customer__phone']
    ordering_fields = ['tier__level', 'enrolled_at']
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return CustomerLoyaltyTier.objects.filter(
                customer__tenant=tenant
            ).select_related('customer', 'tier')
        return CustomerLoyaltyTier.objects.none()
    
    @action(detail=False, methods=['post'])
    def enroll_customer(self, request):
        """Enroll customer in a loyalty tier."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        customer_id = request.data.get('customer_id')
        tier_id = request.data.get('tier_id')
        
        if not customer_id or not tier_id:
            return Response({'error': 'customer_id and tier_id are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            customer = Customer.objects.get(id=customer_id, tenant=tenant)
            tier = LoyaltyTier.objects.get(id=tier_id, tenant=tenant)
        except (Customer.DoesNotExist, LoyaltyTier.DoesNotExist):
            return Response({'error': 'Customer or Tier not found'}, status=status.HTTP_404_NOT_FOUND)
        
        service = LoyaltyProgramService(tenant)
        membership = service.enroll_customer_in_tier(customer, tier)
        
        serializer = CustomerLoyaltyTierSerializer(membership)
        return Response(serializer.data)


class LoyaltyRewardViewSet(viewsets.ModelViewSet):
    """Loyalty reward management."""
    serializer_class = LoyaltyRewardSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'tier_required']
    search_fields = ['name', 'description']
    ordering_fields = ['points_cost', 'created_at']
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return LoyaltyReward.objects.filter(tenant=tenant).select_related('tier_required')
        return LoyaltyReward.objects.none()
    
    def perform_create(self, serializer):
        tenant = get_tenant_from_request(self.request)
        serializer.save(tenant=tenant)


class LoyaltyRedemptionViewSet(viewsets.ModelViewSet):
    """Loyalty redemption management."""
    serializer_class = LoyaltyRedemptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['customer', 'reward', 'status']
    ordering_fields = ['redeemed_at']
    
    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if tenant:
            return LoyaltyRedemption.objects.filter(
                customer__tenant=tenant
            ).select_related('customer', 'reward')
        return LoyaltyRedemption.objects.none()
    
    @action(detail=False, methods=['post'])
    def redeem(self, request):
        """Redeem a loyalty reward."""
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        customer_id = request.data.get('customer_id')
        reward_id = request.data.get('reward_id')
        quantity = int(request.data.get('quantity', 1))
        
        if not customer_id or not reward_id:
            return Response({'error': 'customer_id and reward_id are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            customer = Customer.objects.get(id=customer_id, tenant=tenant)
            reward = LoyaltyReward.objects.get(id=reward_id, tenant=tenant)
        except (Customer.DoesNotExist, LoyaltyReward.DoesNotExist):
            return Response({'error': 'Customer or Reward not found'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            service = LoyaltyProgramService(tenant)
            redemption = service.redeem_points(customer, reward, quantity)
            
            serializer = LoyaltyRedemptionSerializer(redemption)
            return Response(serializer.data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

