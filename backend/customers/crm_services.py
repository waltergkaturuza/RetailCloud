"""
Advanced CRM Services
RFM Analysis, CLV Calculation, Journey Service, Loyalty Service
"""
from django.db.models import Sum, Count, Avg, Max, Min, Q, F, DecimalField
from django.db.models.functions import Coalesce
from django.utils import timezone
from decimal import Decimal
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple
from .models import Customer
from .crm_models import (
    CustomerSegment, CustomerSegmentMembership, CustomerRFMScore,
    CustomerLifetimeValue, CustomerTouchpoint, CustomerJourneyStage,
    LoyaltyTier, CustomerLoyaltyTier, LoyaltyReward, LoyaltyRedemption
)
from core.models import Tenant


class RFMAnalysisService:
    """RFM (Recency, Frequency, Monetary) Analysis Service."""
    
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
    
    def calculate_rfm_for_customer(
        self,
        customer: Customer,
        analysis_period_start: date,
        analysis_period_end: date
    ) -> CustomerRFMScore:
        """
        Calculate RFM scores for a single customer.
        
        Returns:
            CustomerRFMScore instance
        """
        from pos.models import Sale
        
        # Get sales in analysis period
        sales = Sale.objects.filter(
            tenant=self.tenant,
            customer=customer,
            status='completed',
            date__date__gte=analysis_period_start,
            date__date__lte=analysis_period_end
        )
        
        # Calculate Recency (days since last purchase)
        last_sale = sales.order_by('-date').first()
        if last_sale:
            recency_days = (timezone.now().date() - last_sale.date.date()).days
        else:
            # No purchases - use days since customer creation or analysis period start
            recency_days = (analysis_period_end - customer.created_at.date()).days if customer.created_at else (analysis_period_end - analysis_period_start).days
        
        # Calculate Frequency (number of purchases)
        frequency_count = sales.count()
        
        # Calculate Monetary (total revenue)
        monetary_result = sales.aggregate(total=Sum('total_amount'))
        monetary_value = Decimal(str(monetary_result['total'] or 0))
        
        # Calculate scores (1-5 scale using quintiles)
        recency_score = self._calculate_recency_score(recency_days)
        frequency_score = self._calculate_frequency_score(frequency_count)
        monetary_score = self._calculate_monetary_score(monetary_value)
        
        # Composite RFM score
        rfm_score = f"{recency_score}{frequency_score}{monetary_score}"
        
        # Get or create RFM score
        rfm_score_obj, created = CustomerRFMScore.objects.update_or_create(
            customer=customer,
            defaults={
                'tenant': self.tenant,
                'recency_score': recency_score,
                'frequency_score': frequency_score,
                'monetary_score': monetary_score,
                'recency_days': recency_days,
                'frequency_count': frequency_count,
                'monetary_value': monetary_value,
                'rfm_score': rfm_score,
                'analysis_period_start': analysis_period_start,
                'analysis_period_end': analysis_period_end,
                'suggested_segment': self._suggest_segment(rfm_score),
            }
        )
        
        return rfm_score_obj
    
    def calculate_rfm_for_all_customers(
        self,
        analysis_period_start: date,
        analysis_period_end: date,
        batch_size: int = 100
    ) -> Dict:
        """
        Calculate RFM scores for all customers in batches.
        
        Returns:
            dict with summary statistics
        """
        customers = Customer.objects.filter(tenant=self.tenant, is_active=True)
        total_customers = customers.count()
        
        processed = 0
        for customer in customers:
            try:
                self.calculate_rfm_for_customer(customer, analysis_period_start, analysis_period_end)
                processed += 1
            except Exception as e:
                # Log error but continue
                continue
        
        return {
            'total_customers': total_customers,
            'processed': processed,
            'analysis_period_start': analysis_period_start,
            'analysis_period_end': analysis_period_end,
        }
    
    def _calculate_recency_score(self, recency_days: int) -> int:
        """Calculate recency score (1-5). Lower days = higher score."""
        if recency_days <= 30:
            return 5
        elif recency_days <= 60:
            return 4
        elif recency_days <= 90:
            return 3
        elif recency_days <= 180:
            return 2
        else:
            return 1
    
    def _calculate_frequency_score(self, frequency_count: int) -> int:
        """Calculate frequency score (1-5)."""
        if frequency_count >= 20:
            return 5
        elif frequency_count >= 10:
            return 4
        elif frequency_count >= 5:
            return 3
        elif frequency_count >= 2:
            return 2
        elif frequency_count >= 1:
            return 1
        else:
            return 1
    
    def _calculate_monetary_score(self, monetary_value: Decimal) -> int:
        """Calculate monetary score (1-5)."""
        # Use quintiles - for now using fixed thresholds, can be made dynamic
        if monetary_value >= Decimal('5000'):
            return 5
        elif monetary_value >= Decimal('2000'):
            return 4
        elif monetary_value >= Decimal('1000'):
            return 3
        elif monetary_value >= Decimal('500'):
            return 2
        elif monetary_value > Decimal('0'):
            return 1
        else:
            return 1
    
    def _suggest_segment(self, rfm_score: str) -> str:
        """Suggest customer segment based on RFM score."""
        r, f, m = int(rfm_score[0]), int(rfm_score[1]), int(rfm_score[2])
        
        if r >= 4 and f >= 4 and m >= 4:
            return "Champions"
        elif r >= 3 and f >= 3 and m >= 4:
            return "Loyal Customers"
        elif r >= 4 and f <= 2 and m <= 2:
            return "New Customers"
        elif r >= 3 and f <= 2:
            return "Potential Loyalists"
        elif r <= 2 and f >= 4 and m >= 4:
            return "At Risk"
        elif r <= 2 and f <= 2 and m <= 2:
            return "Lost"
        elif r <= 2 and f >= 3:
            return "Hibernating"
        else:
            return "Regular"


class CLVCalculationService:
    """Customer Lifetime Value Calculation Service."""
    
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
    
    def calculate_clv_for_customer(
        self,
        customer: Customer,
        period_start: date = None,
        period_end: date = None
    ) -> CustomerLifetimeValue:
        """
        Calculate Customer Lifetime Value.
        
        Returns:
            CustomerLifetimeValue instance
        """
        from pos.models import Sale, SaleItem
        from inventory.models import Product
        
        if period_end is None:
            period_end = timezone.now().date()
        if period_start is None:
            period_start = customer.created_at.date() if customer.created_at else period_end - timedelta(days=365)
        
        # Get all sales for customer
        sales = Sale.objects.filter(
            tenant=self.tenant,
            customer=customer,
            status='completed',
            date__date__gte=period_start,
            date__date__lte=period_end
        )
        
        # Calculate total revenue
        revenue_result = sales.aggregate(total=Sum('total_amount'))
        total_revenue = Decimal(str(revenue_result['total'] or 0))
        
        # Calculate total cost (COGS from sale items)
        total_cost = Decimal('0.00')
        for sale in sales.select_related().prefetch_related('items'):
            for item in sale.items.all():
                item_cost = Decimal(str(item.cost_price or 0)) * Decimal(str(item.quantity))
                total_cost += item_cost
        
        # Calculate total profit
        total_profit = total_revenue - total_cost
        
        # Calculate metrics
        sales_count = sales.count()
        average_order_value = total_revenue / sales_count if sales_count > 0 else Decimal('0.00')
        
        # Purchase frequency (purchases per period)
        period_days = (period_end - period_start).days
        if period_days > 0:
            purchase_frequency = Decimal(str(sales_count)) / Decimal(str(period_days)) * Decimal('30')  # Per 30 days
        else:
            purchase_frequency = Decimal('0.00')
        
        # Customer age
        customer_age_days = (period_end - period_start).days
        
        # Historical CLV (actual profit)
        historical_clv = total_profit
        
        # Predictive CLV (simplified - can be enhanced with ML)
        # Simple formula: (Avg Order Value * Purchase Frequency) * Customer Lifespan (estimated)
        if purchase_frequency > 0 and average_order_value > 0:
            estimated_lifespan_months = 12  # Default estimate
            predictive_clv = (average_order_value * purchase_frequency * Decimal(str(estimated_lifespan_months)))
        else:
            predictive_clv = None
        
        # Get or create CLV record
        clv_obj, created = CustomerLifetimeValue.objects.update_or_create(
            customer=customer,
            calculation_date=period_end,
            period_start=period_start,
            period_end=period_end,
            defaults={
                'tenant': self.tenant,
                'historical_clv': historical_clv,
                'predictive_clv': predictive_clv,
                'total_revenue': total_revenue,
                'total_cost': total_cost,
                'total_profit': total_profit,
                'average_order_value': average_order_value,
                'purchase_frequency': purchase_frequency,
                'customer_age_days': customer_age_days,
            }
        )
        
        return clv_obj
    
    def calculate_clv_for_all_customers(
        self,
        period_start: date = None,
        period_end: date = None
    ) -> Dict:
        """Calculate CLV for all customers."""
        if period_end is None:
            period_end = timezone.now().date()
        if period_start is None:
            period_start = period_end - timedelta(days=365)
        
        customers = Customer.objects.filter(tenant=self.tenant, is_active=True)
        total_customers = customers.count()
        
        processed = 0
        total_clv = Decimal('0.00')
        
        for customer in customers:
            try:
                clv = self.calculate_clv_for_customer(customer, period_start, period_end)
                total_clv += clv.historical_clv
                processed += 1
            except Exception:
                continue
        
        avg_clv = total_clv / processed if processed > 0 else Decimal('0.00')
        
        return {
            'total_customers': total_customers,
            'processed': processed,
            'total_clv': float(total_clv),
            'average_clv': float(avg_clv),
            'period_start': period_start,
            'period_end': period_end,
        }


class CustomerJourneyService:
    """Customer Journey Mapping Service."""
    
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
    
    def update_customer_journey_stage(
        self,
        customer: Customer,
        new_stage: str,
        engagement_score: int = None,
        converted: bool = False
    ) -> CustomerJourneyStage:
        """
        Update customer's journey stage.
        
        Returns:
            CustomerJourneyStage instance
        """
        # Exit current stage if exists
        current_stage = CustomerJourneyStage.objects.filter(
            customer=customer,
            exited_at__isnull=True
        ).first()
        
        if current_stage:
            current_stage.exited_at = timezone.now()
            if converted:
                current_stage.converted = True
                current_stage.conversion_date = timezone.now()
            current_stage.save()
        
        # Create new stage
        if engagement_score is None:
            engagement_score = self._calculate_engagement_score(customer)
        
        new_stage_obj = CustomerJourneyStage.objects.create(
            customer=customer,
            tenant=self.tenant,
            stage=new_stage,
            engagement_score=engagement_score,
            converted=converted,
            conversion_date=timezone.now() if converted else None
        )
        
        return new_stage_obj
    
    def _calculate_engagement_score(self, customer: Customer) -> int:
        """
        Calculate engagement score (0-100) based on customer activity.
        
        Factors:
        - Purchase frequency
        - Recency of last purchase
        - Total spend
        - Touchpoint count
        """
        from pos.models import Sale
        
        # Recent purchases (last 90 days)
        ninety_days_ago = timezone.now() - timedelta(days=90)
        recent_sales = Sale.objects.filter(
            tenant=self.tenant,
            customer=customer,
            status='completed',
            date__gte=ninety_days_ago
        ).count()
        
        # Recent touchpoints
        recent_touchpoints = CustomerTouchpoint.objects.filter(
            customer=customer,
            interaction_date__gte=ninety_days_ago
        ).count()
        
        # Calculate score (simplified - can be enhanced)
        score = 0
        score += min(40, recent_sales * 10)  # Up to 40 points for purchases
        score += min(30, recent_touchpoints * 5)  # Up to 30 points for touchpoints
        
        # Recency bonus
        if customer.last_purchase_date:
            days_since_last_purchase = (timezone.now().date() - customer.last_purchase_date.date()).days
            if days_since_last_purchase <= 30:
                score += 30
            elif days_since_last_purchase <= 60:
                score += 20
            elif days_since_last_purchase <= 90:
                score += 10
        
        return min(100, score)
    
    def create_touchpoint(
        self,
        customer: Customer,
        touchpoint_type: str,
        channel: str,
        title: str,
        description: str = '',
        reference_type: str = '',
        reference_id: str = '',
        outcome: str = '',
        outcome_value: Decimal = None,
        user=None,
        metadata: dict = None
    ) -> CustomerTouchpoint:
        """
        Create a customer touchpoint record.
        
        Returns:
            CustomerTouchpoint instance
        """
        touchpoint = CustomerTouchpoint.objects.create(
            customer=customer,
            tenant=self.tenant,
            touchpoint_type=touchpoint_type,
            channel=channel,
            title=title,
            description=description,
            reference_type=reference_type,
            reference_id=reference_id,
            outcome=outcome,
            outcome_value=outcome_value,
            user=user,
            metadata=metadata or {}
        )
        
        # Update journey stage based on touchpoint
        self._update_stage_from_touchpoint(customer, touchpoint)
        
        return touchpoint
    
    def _update_stage_from_touchpoint(self, customer: Customer, touchpoint: CustomerTouchpoint):
        """Update customer journey stage based on touchpoint."""
        current_stage = CustomerJourneyStage.objects.filter(
            customer=customer,
            exited_at__isnull=True
        ).first()
        
        # Simple stage progression logic
        if touchpoint.touchpoint_type == 'sale' and touchpoint.outcome == 'purchase':
            if not current_stage or current_stage.stage != 'loyalty':
                self.update_customer_journey_stage(customer, 'loyalty', converted=True)
        elif touchpoint.touchpoint_type == 'visit' and not current_stage:
            self.update_customer_journey_stage(customer, 'awareness')
        elif touchpoint.touchpoint_type in ['email', 'sms', 'campaign_response']:
            if not current_stage or current_stage.stage == 'awareness':
                self.update_customer_journey_stage(customer, 'consideration')


class LoyaltyProgramService:
    """Advanced Loyalty Program Service."""
    
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
    
    def enroll_customer_in_tier(
        self,
        customer: Customer,
        tier: LoyaltyTier
    ) -> CustomerLoyaltyTier:
        """
        Enroll customer in a loyalty tier.
        
        Returns:
            CustomerLoyaltyTier instance
        """
        membership, created = CustomerLoyaltyTier.objects.update_or_create(
            customer=customer,
            defaults={
                'tier': tier,
            }
        )
        
        return membership
    
    def calculate_tier_for_customer(self, customer: Customer) -> Optional[LoyaltyTier]:
        """Calculate appropriate tier for customer based on criteria."""
        # Get customer stats
        total_points = customer.loyalty_points or 0
        total_spend = customer.total_purchases or Decimal('0.00')
        total_purchases = customer.total_visits or 0
        
        # Find matching tier (highest level that customer qualifies for)
        tiers = LoyaltyTier.objects.filter(
            tenant=self.tenant,
            is_active=True
        ).order_by('-level')
        
        for tier in tiers:
            if (total_points >= tier.min_points and
                total_spend >= tier.min_spend and
                total_purchases >= tier.min_purchases):
                return tier
        
        # Return lowest tier if no match (or None if no tiers exist)
        return tiers.order_by('level').first()
    
    def award_points(
        self,
        customer: Customer,
        points: int,
        reason: str = '',
        reference_type: str = '',
        reference_id: str = ''
    ) -> bool:
        """
        Award loyalty points to customer.
        
        Returns:
            True if successful
        """
        # Get customer's tier
        try:
            tier_membership = customer.loyalty_tier_membership
            tier = tier_membership.tier
            points_multiplier = Decimal(str(tier.benefits.get('points_multiplier', 1.0)))
            adjusted_points = int(points * points_multiplier)
        except CustomerLoyaltyTier.DoesNotExist:
            adjusted_points = points
        
        # Update customer points
        customer.loyalty_points = (customer.loyalty_points or 0) + adjusted_points
        customer.loyalty_points_balance = (customer.loyalty_points_balance or 0) + adjusted_points
        customer.save(update_fields=['loyalty_points', 'loyalty_points_balance'])
        
        # Update tier membership if exists
        try:
            tier_membership.points_earned_lifetime += adjusted_points
            tier_membership.points_balance = customer.loyalty_points_balance
            tier_membership.save(update_fields=['points_earned_lifetime', 'points_balance'])
        except CustomerLoyaltyTier.DoesNotExist:
            pass
        
        # Check for tier upgrade
        self._check_tier_upgrade(customer)
        
        # Create touchpoint
        journey_service = CustomerJourneyService(self.tenant)
        journey_service.create_touchpoint(
            customer=customer,
            touchpoint_type='other',
            channel='system',
            title=f'Awarded {adjusted_points} loyalty points',
            description=reason,
            reference_type=reference_type,
            reference_id=reference_id,
            metadata={'points': adjusted_points, 'reason': reason}
        )
        
        return True
    
    def redeem_points(
        self,
        customer: Customer,
        reward: LoyaltyReward,
        quantity: int = 1
    ) -> LoyaltyRedemption:
        """
        Redeem loyalty reward for customer.
        
        Returns:
            LoyaltyRedemption instance
        """
        total_points_needed = reward.points_cost * quantity
        
        # Check if customer has enough points
        if customer.loyalty_points_balance < total_points_needed:
            raise ValueError(f"Insufficient points. Required: {total_points_needed}, Available: {customer.loyalty_points_balance}")
        
        # Check tier requirement
        if reward.tier_required:
            try:
                tier_membership = customer.loyalty_tier_membership
                if tier_membership.tier.level < reward.tier_required.level:
                    raise ValueError(f"Tier {reward.tier_required.name} required to redeem this reward")
            except CustomerLoyaltyTier.DoesNotExist:
                raise ValueError(f"Tier {reward.tier_required.name} required to redeem this reward")
        
        # Check availability
        if reward.stock_quantity is not None and reward.stock_quantity < quantity:
            raise ValueError(f"Insufficient stock. Available: {reward.stock_quantity}")
        
        # Deduct points
        customer.loyalty_points_balance -= total_points_needed
        customer.loyalty_points_used = (customer.loyalty_points or 0) - customer.loyalty_points_balance
        customer.save(update_fields=['loyalty_points_balance'])
        
        # Update tier membership
        try:
            tier_membership = customer.loyalty_tier_membership
            tier_membership.points_used_lifetime += total_points_needed
            tier_membership.points_balance = customer.loyalty_points_balance
            tier_membership.save(update_fields=['points_used_lifetime', 'points_balance'])
        except CustomerLoyaltyTier.DoesNotExist:
            pass
        
        # Create redemption
        redemption = LoyaltyRedemption.objects.create(
            customer=customer,
            reward=reward,
            points_used=total_points_needed,
            status='pending'
        )
        
        # Update reward stock
        if reward.stock_quantity is not None:
            reward.stock_quantity -= quantity
            reward.redemption_count += 1
            reward.save(update_fields=['stock_quantity', 'redemption_count'])
        
        return redemption
    
    def _check_tier_upgrade(self, customer: Customer):
        """Check if customer qualifies for tier upgrade."""
        new_tier = self.calculate_tier_for_customer(customer)
        if new_tier:
            try:
                current_membership = customer.loyalty_tier_membership
                if current_membership.tier.level < new_tier.level:
                    # Upgrade customer
                    self.enroll_customer_in_tier(customer, new_tier)
            except CustomerLoyaltyTier.DoesNotExist:
                # Enroll in tier
                self.enroll_customer_in_tier(customer, new_tier)

