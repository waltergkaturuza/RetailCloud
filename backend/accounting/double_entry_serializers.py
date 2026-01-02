"""
Serializers for double-entry bookkeeping models (premium feature).
"""
from rest_framework import serializers
from .double_entry_models import (
    ChartOfAccounts,
    JournalEntry,
    JournalLine,
    GeneralLedger,
    AccountType
)
from core.models import Branch


class ChartOfAccountsSerializer(serializers.ModelSerializer):
    """Serializer for Chart of Accounts."""
    account_type_display = serializers.CharField(source='get_account_type_display', read_only=True)
    normal_balance_display = serializers.CharField(source='get_normal_balance_display', read_only=True)
    parent_code = serializers.CharField(source='parent.code', read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    current_balance = serializers.SerializerMethodField()
    sub_account_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChartOfAccounts
        fields = [
            'id', 'code', 'name', 'description', 'account_type', 'account_type_display',
            'parent', 'parent_code', 'parent_name', 'is_active', 'is_system_account',
            'normal_balance', 'normal_balance_display', 'allow_manual_entries',
            'requires_reconciliation', 'current_balance', 'sub_account_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_system_account']
    
    def get_current_balance(self, obj):
        """Get current balance for the account."""
        request = self.context.get('request')
        as_of_date = request.query_params.get('as_of_date') if request else None
        
        from datetime import date
        if as_of_date:
            try:
                as_of_date = date.fromisoformat(as_of_date)
            except (ValueError, AttributeError):
                as_of_date = None
        
        balance = obj.get_balance(as_of_date)
        balance_display = obj.get_balance_display(as_of_date)
        
        return {
            'net_balance': float(balance),
            'debit_balance': float(balance_display['debit']),
            'credit_balance': float(balance_display['credit']),
        }
    
    def get_sub_account_count(self, obj):
        """Get count of sub-accounts."""
        return obj.sub_accounts.count()


class ChartOfAccountsListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for account lists."""
    account_type_display = serializers.CharField(source='get_account_type_display', read_only=True)
    
    class Meta:
        model = ChartOfAccounts
        fields = [
            'id', 'code', 'name', 'account_type', 'account_type_display',
            'is_active', 'normal_balance'
        ]


class JournalLineSerializer(serializers.ModelSerializer):
    """Serializer for Journal Line."""
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    
    class Meta:
        model = JournalLine
        fields = [
            'id', 'account', 'account_code', 'account_name',
            'debit_amount', 'credit_amount', 'description', 'reference'
        ]
    
    def validate(self, data):
        """Validate that only one of debit_amount or credit_amount is non-zero."""
        debit = data.get('debit_amount', 0)
        credit = data.get('credit_amount', 0)
        
        if debit > 0 and credit > 0:
            raise serializers.ValidationError("A line cannot have both debit and credit amounts")
        
        if debit == 0 and credit == 0:
            raise serializers.ValidationError("A line must have either a debit or credit amount")
        
        return data


class JournalEntrySerializer(serializers.ModelSerializer):
    """Serializer for Journal Entry."""
    journal_lines = JournalLineSerializer(many=True, read_only=True)
    total_debits = serializers.SerializerMethodField()
    total_credits = serializers.SerializerMethodField()
    is_balanced = serializers.SerializerMethodField()
    posted_by_name = serializers.CharField(source='posted_by.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    
    class Meta:
        model = JournalEntry
        fields = [
            'id', 'entry_number', 'date', 'description', 'reference', 'entry_type',
            'tenant', 'branch', 'branch_name', 'is_posted', 'posted_at', 'posted_by',
            'posted_by_name', 'created_by', 'created_by_name', 'reversed_by',
            'journal_lines', 'total_debits', 'total_credits', 'is_balanced',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'entry_number', 'is_posted', 'posted_at', 'posted_by',
            'created_at', 'updated_at'
        ]
    
    def get_total_debits(self, obj):
        return float(obj.get_total_debits())
    
    def get_total_credits(self, obj):
        return float(obj.get_total_credits())
    
    def get_is_balanced(self, obj):
        return obj.is_balanced()


class JournalEntryCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating journal entries with lines."""
    journal_lines = JournalLineSerializer(many=True)
    
    class Meta:
        model = JournalEntry
        fields = [
            'date', 'description', 'reference', 'entry_type',
            'branch', 'journal_lines'
        ]
    
    def validate_journal_lines(self, value):
        """Validate that there are at least 2 lines."""
        if len(value) < 2:
            raise serializers.ValidationError("A journal entry must have at least 2 lines")
        return value
    
    def create(self, validated_data):
        """Create journal entry with lines."""
        lines_data = validated_data.pop('journal_lines')
        entry = JournalEntry.objects.create(
            **validated_data,
            tenant=self.context['request'].tenant,
            created_by=self.context['request'].user
        )
        
        for line_data in lines_data:
            JournalLine.objects.create(journal_entry=entry, **line_data)
        
        return entry
    
    def update(self, instance, validated_data):
        """Update journal entry with lines."""
        if instance.is_posted:
            raise serializers.ValidationError("Cannot edit a posted journal entry")
        
        lines_data = validated_data.pop('journal_lines', None)
        
        # Update entry fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update lines if provided
        if lines_data is not None:
            # Delete existing lines
            instance.journal_lines.all().delete()
            
            # Create new lines
            for line_data in lines_data:
                JournalLine.objects.create(journal_entry=instance, **line_data)
        
        return instance


class GeneralLedgerSerializer(serializers.ModelSerializer):
    """Serializer for General Ledger."""
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    closing_balance = serializers.SerializerMethodField()
    
    class Meta:
        model = GeneralLedger
        fields = [
            'id', 'account', 'account_code', 'account_name',
            'period_year', 'period_month', 'opening_debit', 'opening_credit',
            'period_debit', 'period_credit', 'closing_debit', 'closing_credit',
            'closing_balance', 'updated_at'
        ]
        read_only_fields = fields
    
    def get_closing_balance(self, obj):
        return float(obj.get_closing_balance())


class TrialBalanceSerializer(serializers.Serializer):
    """Serializer for Trial Balance report."""
    as_of_date = serializers.DateField()
    accounts = serializers.ListField()
    total_debits = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_credits = serializers.DecimalField(max_digits=12, decimal_places=2)
    is_balanced = serializers.BooleanField()
    difference = serializers.DecimalField(max_digits=12, decimal_places=2)


class BalanceSheetSerializer(serializers.Serializer):
    """Serializer for Balance Sheet report."""
    as_of_date = serializers.DateField()
    assets = serializers.DictField()
    liabilities = serializers.DictField()
    equity = serializers.DictField()
    total_assets = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_liabilities_and_equity = serializers.DecimalField(max_digits=12, decimal_places=2)
    is_balanced = serializers.BooleanField()
    difference = serializers.DecimalField(max_digits=12, decimal_places=2)


class CashFlowSerializer(serializers.Serializer):
    """Serializer for Cash Flow Statement."""
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    operating_activities = serializers.DictField()
    investing_activities = serializers.DictField()
    financing_activities = serializers.DictField()
    net_cash_flow = serializers.DecimalField(max_digits=12, decimal_places=2)
    opening_cash = serializers.DecimalField(max_digits=12, decimal_places=2)
    closing_cash = serializers.DecimalField(max_digits=12, decimal_places=2)
    reconciliation = serializers.DecimalField(max_digits=12, decimal_places=2)

