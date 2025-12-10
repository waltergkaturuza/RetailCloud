"""
Management command to generate invoices for subscriptions expiring soon.
Run this daily (via cron or Celery beat) to generate invoices 1 week before expiry.
"""
from django.core.management.base import BaseCommand
from subscriptions.invoice_service import generate_upcoming_invoices


class Command(BaseCommand):
    help = 'Generate invoices for subscriptions expiring within 7 days'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days before expiry to generate invoice (default: 7)',
        )
    
    def handle(self, *args, **options):
        days = options['days']
        self.stdout.write(f'Generating invoices for subscriptions expiring within {days} days...')
        
        invoices = generate_upcoming_invoices(days_before_expiry=days)
        
        if invoices:
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Generated {len(invoices)} invoice(s):'
                )
            )
            for invoice in invoices:
                self.stdout.write(
                    f'  - {invoice.invoice_number} for {invoice.tenant.company_name} '
                    f'({invoice.currency} {invoice.total_amount:.2f})'
                )
        else:
            self.stdout.write(self.style.WARNING('No invoices to generate at this time.'))
        
        self.stdout.write(self.style.SUCCESS('Invoice generation complete!'))


