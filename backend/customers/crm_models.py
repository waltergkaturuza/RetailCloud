"""
Advanced CRM Models for Customer Segmentation, CLV, and Journey Tracking
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta, date
from core.models import Tenant


class CustomerSegment(models.Model):
    """Customer segments for segmentation."""
    
    SEGMENT_TYPE_CHOICES = [
        ('rfm', 'RFM Analysis'),
        ('behavioral', 'Behavioral'),
        ('demographic', 'Demographic'),
        ('value', 'Value-Based'),
        ('custom', 'Custom'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='customer_segments')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    segment_type = models.CharField(max_length=20, choices=SEGMENT_TYPE_CHOICES, default='custom')
    
    # RFM Criteria (if RFM segment)
    rfm_recency_min = models.IntegerField(null=True, blank=True, help_text="Minimum recency score (1-5)")
    rfm_recency_max = models.IntegerField(null=True, blank=True, help_text="Maximum recency score (1-5)")
    rfm_frequency_min = models.IntegerField(null=True, blank=True, help_text="Minimum frequency score (1-5)")
    rfm_frequency_max = models.IntegerField(null=True, blank=True, help_text="Maximum frequency score (1-5)")
    rfm_monetary_min = models.IntegerField(null=True, blank=True, help_text="Minimum monetary score (1-5)")
    rfm_monetary_max = models.IntegerField(null=True, blank=True, help_text="Maximum monetary score (1-5)")
    
    # Behavioral criteria (JSON for flexibility)
    behavioral_criteria = models.JSONField(default=dict, blank=True, help_text="Behavioral segmentation rules")
    
    # Auto-assignment
    auto_assign = models.BooleanField(default=False, help_text="Automatically assign customers to this segment")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customer_segments'
        unique_together = [['tenant', 'name']]
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_segment_type_display()})"


class CustomerSegmentMembership(models.Model):
    """Customer membership in segments."""
    
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE, related_name='segment_memberships')
    segment = models.ForeignKey(CustomerSegment, on_delete=models.CASCADE, related_name='members')
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'customer_segment_memberships'
        unique_together = [['customer', 'segment']]
        ordering = ['-assigned_at']
    
    def __str__(self):
        return f"{self.customer.full_name} - {self.segment.name}"


class CustomerRFMScore(models.Model):
    """RFM analysis scores for customers."""
    
    customer = models.OneToOneField('Customer', on_delete=models.CASCADE, related_name='rfm_score')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='customer_rfm_scores')
    
    # Scores (1-5 scale)
    recency_score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], help_text="Recency score (1=oldest, 5=newest)")
    frequency_score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], help_text="Frequency score (1=lowest, 5=highest)")
    monetary_score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], help_text="Monetary score (1=lowest, 5=highest)")
    
    # RFM Values (actual metrics)
    recency_days = models.IntegerField(help_text="Days since last purchase")
    frequency_count = models.IntegerField(help_text="Number of purchases in analysis period")
    monetary_value = models.DecimalField(max_digits=10, decimal_places=2, help_text="Total monetary value in analysis period")
    
    # Composite score
    rfm_score = models.CharField(max_length=10, help_text="Combined RFM score (e.g., '555', '432')")
    
    # Analysis period
    analysis_period_start = models.DateField()
    analysis_period_end = models.DateField()
    
    # Segment suggestion
    suggested_segment = models.CharField(max_length=100, blank=True, help_text="Suggested segment based on RFM")
    
    calculated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customer_rfm_scores'
        indexes = [
            models.Index(fields=['tenant', 'rfm_score']),
            models.Index(fields=['customer', '-calculated_at']),
        ]
    
    def __str__(self):
        return f"{self.customer.full_name} - RFM {self.rfm_score}"


class CustomerLifetimeValue(models.Model):
    """Customer Lifetime Value tracking."""
    
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE, related_name='clv_records')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='customer_clv_records')
    
    # Historical CLV
    historical_clv = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Historical lifetime value (actual revenue)"
    )
    
    # Predictive CLV (ML-based estimate)
    predictive_clv = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Predicted future lifetime value"
    )
    
    # CLV Components
    total_revenue = models.DecimalField(max_digits=10, decimal_places=2, help_text="Total revenue from customer")
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), help_text="Total cost of serving customer")
    total_profit = models.DecimalField(max_digits=10, decimal_places=2, help_text="Total profit from customer")
    
    # Metrics
    average_order_value = models.DecimalField(max_digits=10, decimal_places=2, help_text="Average order value")
    purchase_frequency = models.DecimalField(max_digits=5, decimal_places=2, help_text="Purchases per period")
    customer_age_days = models.IntegerField(help_text="Customer age in days")
    
    # Period
    calculation_date = models.DateField(default=timezone.now)
    period_start = models.DateField(help_text="Start date for calculation period")
    period_end = models.DateField(help_text="End date for calculation period")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customer_lifetime_values'
        ordering = ['-calculation_date']
        indexes = [
            models.Index(fields=['tenant', '-historical_clv']),
            models.Index(fields=['customer', '-calculation_date']),
        ]
    
    def __str__(self):
        return f"{self.customer.full_name} - CLV: {self.historical_clv}"


class CustomerTouchpoint(models.Model):
    """Customer interaction/touchpoint tracking."""
    
    TOUCHPOINT_TYPE_CHOICES = [
        ('sale', 'Sale'),
        ('purchase_return', 'Purchase Return'),
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('phone_call', 'Phone Call'),
        ('visit', 'Store Visit'),
        ('website_visit', 'Website Visit'),
        ('campaign_response', 'Campaign Response'),
        ('support_ticket', 'Support Ticket'),
        ('review', 'Review'),
        ('social_media', 'Social Media'),
        ('other', 'Other'),
    ]
    
    CHANNEL_CHOICES = [
        ('in_store', 'In Store'),
        ('online', 'Online'),
        ('phone', 'Phone'),
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('social_media', 'Social Media'),
        ('mobile_app', 'Mobile App'),
        ('other', 'Other'),
    ]
    
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE, related_name='touchpoints')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='customer_touchpoints')
    
    touchpoint_type = models.CharField(max_length=30, choices=TOUCHPOINT_TYPE_CHOICES)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    
    # Interaction details
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Reference to source
    reference_type = models.CharField(max_length=50, blank=True, help_text="Type of reference (Sale, Email, etc.)")
    reference_id = models.CharField(max_length=255, blank=True, help_text="ID of referenced object")
    
    # Outcome
    outcome = models.CharField(max_length=50, blank=True, help_text="Outcome (purchase, inquiry, complaint, etc.)")
    outcome_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Monetary value of outcome")
    
    # Metadata
    interaction_date = models.DateTimeField(default=timezone.now)
    user = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, help_text="User who interacted")
    
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional data")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'customer_touchpoints'
        ordering = ['-interaction_date']
        indexes = [
            models.Index(fields=['customer', '-interaction_date']),
            models.Index(fields=['tenant', 'touchpoint_type', '-interaction_date']),
            models.Index(fields=['reference_type', 'reference_id']),
        ]
    
    def __str__(self):
        return f"{self.customer.full_name} - {self.get_touchpoint_type_display()} ({self.interaction_date.date()})"


class CustomerJourneyStage(models.Model):
    """Customer journey stage tracking."""
    
    STAGE_CHOICES = [
        ('awareness', 'Awareness'),
        ('consideration', 'Consideration'),
        ('purchase', 'Purchase'),
        ('post_purchase', 'Post-Purchase'),
        ('loyalty', 'Loyalty'),
        ('advocacy', 'Advocacy'),
        ('churned', 'Churned'),
    ]
    
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE, related_name='journey_stages')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='customer_journey_stages')
    
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES)
    entered_at = models.DateTimeField(default=timezone.now)
    exited_at = models.DateTimeField(null=True, blank=True)
    
    # Engagement score (0-100)
    engagement_score = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Engagement score at this stage"
    )
    
    # Conversion tracking
    converted = models.BooleanField(default=False, help_text="Did customer convert at this stage?")
    conversion_date = models.DateTimeField(null=True, blank=True)
    
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customer_journey_stages'
        ordering = ['-entered_at']
        indexes = [
            models.Index(fields=['customer', '-entered_at']),
            models.Index(fields=['tenant', 'stage', '-entered_at']),
        ]
    
    def __str__(self):
        return f"{self.customer.full_name} - {self.get_stage_display()}"


class LoyaltyTier(models.Model):
    """Tiered loyalty program tiers."""
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='loyalty_tiers')
    
    name = models.CharField(max_length=50, help_text="Tier name (Bronze, Silver, Gold, Platinum)")
    level = models.IntegerField(help_text="Tier level (1=lowest, higher=better)")
    
    # Qualification criteria
    min_points = models.IntegerField(default=0, help_text="Minimum points required for this tier")
    min_spend = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), help_text="Minimum spend required")
    min_purchases = models.IntegerField(default=0, help_text="Minimum number of purchases required")
    
    # Benefits (JSON for flexibility)
    benefits = models.JSONField(
        default=dict,
        blank=True,
        help_text="Tier benefits (e.g., {'points_multiplier': 1.5, 'discount_percentage': 10})"
    )
    
    # Points rules
    points_earn_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('1.00'),
        help_text="Points earned per currency unit (e.g., 1.5 = 1.5 points per $1)"
    )
    points_expiry_days = models.IntegerField(null=True, blank=True, help_text="Days before points expire (null = no expiry)")
    
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'loyalty_tiers'
        unique_together = [['tenant', 'level']]
        ordering = ['level']
    
    def __str__(self):
        return f"{self.name} (Level {self.level})"


class CustomerLoyaltyTier(models.Model):
    """Customer's current loyalty tier."""
    
    customer = models.OneToOneField('Customer', on_delete=models.CASCADE, related_name='loyalty_tier_membership')
    tier = models.ForeignKey(LoyaltyTier, on_delete=models.PROTECT, related_name='members')
    
    enrolled_at = models.DateTimeField(auto_now_add=True)
    last_tier_change = models.DateTimeField(auto_now=True)
    
    # Points tracking
    points_earned_lifetime = models.IntegerField(default=0, help_text="Total points earned (lifetime)")
    points_used_lifetime = models.IntegerField(default=0, help_text="Total points used (lifetime)")
    points_balance = models.IntegerField(default=0, help_text="Current points balance")
    
    # Qualification tracking
    current_spend = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), help_text="Current period spend")
    current_purchases = models.IntegerField(default=0, help_text="Current period purchase count")
    
    class Meta:
        db_table = 'customer_loyalty_tiers'
    
    def __str__(self):
        return f"{self.customer.full_name} - {self.tier.name}"


class LoyaltyReward(models.Model):
    """Reward catalog for loyalty program."""
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='loyalty_rewards')
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Reward details
    points_cost = models.IntegerField(validators=[MinValueValidator(1)], help_text="Points required to redeem")
    monetary_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Equivalent monetary value")
    
    # Eligibility
    tier_required = models.ForeignKey(
        LoyaltyTier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rewards',
        help_text="Minimum tier required to redeem"
    )
    
    # Availability
    is_active = models.BooleanField(default=True)
    stock_quantity = models.IntegerField(null=True, blank=True, help_text="Available quantity (null = unlimited)")
    expiry_date = models.DateField(null=True, blank=True)
    
    # Usage
    redemption_count = models.IntegerField(default=0, help_text="Number of times redeemed")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'loyalty_rewards'
        ordering = ['points_cost']
    
    def __str__(self):
        return f"{self.name} ({self.points_cost} points)"


class LoyaltyRedemption(models.Model):
    """Loyalty reward redemptions."""
    
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE, related_name='loyalty_redemptions')
    reward = models.ForeignKey(LoyaltyReward, on_delete=models.PROTECT, related_name='redemptions')
    
    points_used = models.IntegerField(validators=[MinValueValidator(1)])
    redeemed_at = models.DateTimeField(auto_now_add=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('fulfilled', 'Fulfilled'),
            ('cancelled', 'Cancelled'),
        ],
        default='pending'
    )
    
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'loyalty_redemptions'
        ordering = ['-redeemed_at']
    
    def __str__(self):
        return f"{self.customer.full_name} - {self.reward.name} ({self.points_used} points)"

