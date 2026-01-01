"""
Management command to create initial currencies for Zimbabwe POS.
"""
from django.core.management.base import BaseCommand
from core.currency_models import Currency


class Command(BaseCommand):
    help = 'Create initial currencies (USD, ZWL, ZAR)'

    def handle(self, *args, **options):
        currencies = [
            {'code': 'USD', 'name': 'US Dollar', 'symbol': '$', 'is_base': True, 'sort_order': 1},
            {'code': 'ZWL', 'name': 'Zimbabwe Dollar', 'symbol': 'Z$', 'is_base': False, 'sort_order': 2},
            {'code': 'ZAR', 'name': 'South African Rand', 'symbol': 'R', 'is_base': False, 'sort_order': 3},
        ]
        
        for currency_data in currencies:
            currency, created = Currency.objects.get_or_create(
                code=currency_data['code'],
                defaults=currency_data
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created currency: {currency.code} - {currency.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Currency already exists: {currency.code}')
                )




