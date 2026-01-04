"""
Serializers for Advanced CRM features.
"""
from rest_framework import serializers
from .crm_models import (
    CustomerSegment, CustomerSegmentMembership, CustomerRFMScore,
    CustomerLifetimeValue, CustomerTouchpoint, CustomerJourneyStage,
    LoyaltyTier, CustomerLoyaltyTier, LoyaltyReward, LoyaltyRedemption
)
from .models import Customer


class CustomerSegmentSerializer(serializers.ModelSerializer):
    """Customer segment serializer."""
    
    class Meta:
        model = CustomerSegment
        fields = [
            'id', 'name', 'description', 'segment_type',
            'rfm_recency_min', 'rfm_recency_max',
            'rfm_frequency_min', 'rfm_frequency_max',
            'rfm_monetary_min', 'rfm_monetary_max',
            'behavioral_criteria', 'auto_assign', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class CustomerSegmentMembershipSerializer(serializers.ModelSerializer):
    """Customer segment membership serializer."""
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    segment_name = serializers.CharField(source='segment.name', read_only=True)
    
    class Meta:
        model = CustomerSegmentMembership
        fields = [
            'id', 'customer', 'customer_name', 'segment', 'segment_name',
            'assigned_at', 'assigned_by', 'notes'
        ]
        read_only_fields = ['assigned_at']


class CustomerRFMScoreSerializer(serializers.ModelSerializer):
    """RFM score serializer."""
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    
    class Meta:
        model = CustomerRFMScore
        fields = [
            'id', 'customer', 'customer_name',
            'recency_score', 'frequency_score', 'monetary_score',
            'recency_days', 'frequency_count', 'monetary_value',
            'rfm_score', 'suggested_segment',
            'analysis_period_start', 'analysis_period_end',
            'calculated_at', 'updated_at'
        ]
        read_only_fields = ['calculated_at', 'updated_at']


class CustomerLifetimeValueSerializer(serializers.ModelSerializer):
    """Customer Lifetime Value serializer."""
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    
    class Meta:
        model = CustomerLifetimeValue
        fields = [
            'id', 'customer', 'customer_name',
            'historical_clv', 'predictive_clv',
            'total_revenue', 'total_cost', 'total_profit',
            'average_order_value', 'purchase_frequency',
            'customer_age_days', 'calculation_date',
            'period_start', 'period_end',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class CustomerTouchpointSerializer(serializers.ModelSerializer):
    """Customer touchpoint serializer."""
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = CustomerTouchpoint
        fields = [
            'id', 'customer', 'customer_name',
            'touchpoint_type', 'channel', 'title', 'description',
            'reference_type', 'reference_id', 'outcome', 'outcome_value',
            'interaction_date', 'user', 'user_name',
            'metadata', 'created_at'
        ]
        read_only_fields = ['created_at']


class CustomerJourneyStageSerializer(serializers.ModelSerializer):
    """Customer journey stage serializer."""
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    
    class Meta:
        model = CustomerJourneyStage
        fields = [
            'id', 'customer', 'customer_name',
            'stage', 'entered_at', 'exited_at',
            'engagement_score', 'converted', 'conversion_date',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class LoyaltyTierSerializer(serializers.ModelSerializer):
    """Loyalty tier serializer."""
    
    class Meta:
        model = LoyaltyTier
        fields = [
            'id', 'name', 'level', 'description',
            'min_points', 'min_spend', 'min_purchases',
            'benefits', 'points_earn_rate', 'points_expiry_days',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class CustomerLoyaltyTierSerializer(serializers.ModelSerializer):
    """Customer loyalty tier membership serializer."""
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    tier_name = serializers.CharField(source='tier.name', read_only=True)
    tier_level = serializers.IntegerField(source='tier.level', read_only=True)
    
    class Meta:
        model = CustomerLoyaltyTier
        fields = [
            'id', 'customer', 'customer_name',
            'tier', 'tier_name', 'tier_level',
            'enrolled_at', 'last_tier_change',
            'points_earned_lifetime', 'points_used_lifetime', 'points_balance',
            'current_spend', 'current_purchases'
        ]
        read_only_fields = ['enrolled_at', 'last_tier_change']


class LoyaltyRewardSerializer(serializers.ModelSerializer):
    """Loyalty reward serializer."""
    tier_required_name = serializers.CharField(source='tier_required.name', read_only=True)
    
    class Meta:
        model = LoyaltyReward
        fields = [
            'id', 'name', 'description',
            'points_cost', 'monetary_value',
            'tier_required', 'tier_required_name',
            'is_active', 'stock_quantity', 'expiry_date',
            'redemption_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['redemption_count', 'created_at', 'updated_at']


class LoyaltyRedemptionSerializer(serializers.ModelSerializer):
    """Loyalty redemption serializer."""
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    reward_name = serializers.CharField(source='reward.name', read_only=True)
    
    class Meta:
        model = LoyaltyRedemption
        fields = [
            'id', 'customer', 'customer_name',
            'reward', 'reward_name',
            'points_used', 'redeemed_at', 'status', 'notes'
        ]
        read_only_fields = ['redeemed_at']


