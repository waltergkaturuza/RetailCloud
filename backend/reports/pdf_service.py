"""
PDF Export Service for Trading Profit & Loss Statements
"""
from io import BytesIO
from decimal import Decimal
from datetime import datetime
from typing import Dict, Optional
import os
from django.conf import settings

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image, KeepTogether, TableCell, Flowable
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    from reportlab.lib.utils import ImageReader
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


class PLStatementPDF:
    """Generate PDF for Trading Profit & Loss Statement."""
    
    def __init__(self, pl_data: Dict, tenant, logo_path: Optional[str] = None):
        self.pl_data = pl_data
        self.tenant = tenant
        self.tenant_name = tenant.company_name if hasattr(tenant, 'company_name') else str(tenant)
        self.logo_path = logo_path
        self.styles = getSampleStyleSheet() if REPORTLAB_AVAILABLE else None
    
    def generate_pdf(self) -> BytesIO:
        """Generate PDF buffer."""
        if not REPORTLAB_AVAILABLE:
            raise ImportError("reportlab is not installed. Install with: pip install reportlab")
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.3*inch, bottomMargin=0.8*inch)
        
        story = []
        
        # Header with Logo and Company Info
        # Right column: Company Name and Details
        company_style = ParagraphStyle(
            'CompanyName',
            parent=self.styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        company_info = f"<b>{self.tenant_name}</b>"
        if hasattr(self.tenant, 'address') and self.tenant.address:
            company_info += f"<br/>{self.tenant.address}"
        if hasattr(self.tenant, 'city') and self.tenant.city:
            company_info += f"<br/>{self.tenant.city}"
        if hasattr(self.tenant, 'country') and self.tenant.country:
            company_info += f"<br/>{self.tenant.country}"
        if hasattr(self.tenant, 'phone') and self.tenant.phone:
            company_info += f"<br/>Phone: {self.tenant.phone}"
        if hasattr(self.tenant, 'vat_number') and self.tenant.vat_number:
            company_info += f"<br/>VAT Number: {self.tenant.vat_number}"
        
        # Create header table: logo on left (if available), company info on right
        logo_cell = Paragraph('', self.styles['Normal'])  # Empty paragraph as placeholder
        if self.logo_path and os.path.exists(self.logo_path):
            try:
                logo_img = Image(self.logo_path, width=1.5*inch, height=1.5*inch)
                logo_cell = logo_img
            except Exception:
                # If logo fails to load, use empty paragraph
                logo_cell = Paragraph('', self.styles['Normal'])
        
        # Create single row table: logo on left, company info on right
        header_data = [[logo_cell, Paragraph(company_info, company_style)]]
        
        header_table = Table(header_data, colWidths=[2*inch, 4.5*inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, 0), TA_LEFT),
            ('ALIGN', (1, 0), (1, 0), TA_CENTER),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        story.append(Paragraph("TRADING PROFIT & LOSS STATEMENT", title_style))
        
        # Period - Format dates nicely
        period = self.pl_data.get('period', {})
        start_date_str = period.get('start_date', '')
        end_date_str = period.get('end_date', '')
        
        try:
            if start_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                start_date_formatted = start_date.strftime('%B %d, %Y')
            else:
                start_date_formatted = 'N/A'
            
            if end_date_str:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
                end_date_formatted = end_date.strftime('%B %d, %Y')
            else:
                end_date_formatted = 'N/A'
            
            period_text = f"For the period: {start_date_formatted} to {end_date_formatted}"
        except (ValueError, TypeError):
            period_text = f"For the period: {start_date_str} to {end_date_str}"
        
        period_style = ParagraphStyle(
            'Period',
            parent=self.styles['Normal'],
            fontSize=12,
            alignment=TA_CENTER,
            spaceAfter=12
        )
        story.append(Paragraph(period_text, period_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Trading Account Section
        story.append(Paragraph("<b>TRADING ACCOUNT</b>", self.styles['Heading2']))
        trading = self.pl_data.get('trading_account', {})
        
        # Get currency symbol
        currency_symbol = '$'
        if hasattr(self.tenant, 'currency'):
            currency_code = self.tenant.currency.upper()
            currency_symbols = {
                'USD': '$',
                'ZWL': 'ZWL$',
                'ZAR': 'R',
                'GBP': '£',
                'EUR': '€',
                'KES': 'KSh',
            }
            currency_symbol = currency_symbols.get(currency_code, currency_code)
        
        trading_data = [
            [f'Description', f'Amount ({currency_symbol})'],
            ['Sales Revenue', self._format_currency(trading.get('revenue', 0), currency_symbol)],
            ['Less: Sales Discounts', f"({self._format_currency(trading.get('sales_discounts', 0), currency_symbol)})"],
            ['Less: Returns', f"({self._format_currency(trading.get('returns_value', 0), currency_symbol)})"],
            ['<b>Net Revenue</b>', f"<b>{self._format_currency(trading.get('net_revenue', 0), currency_symbol)}</b>"],
            [''],
            ['Cost of Goods Sold', self._format_currency(trading.get('cost_of_goods_sold', 0), currency_symbol)],
            ['Less: COGS Reversed (Returns)', f"({self._format_currency(trading.get('returns_adjustment', {}).get('cogs_reversed', 0), currency_symbol)})"],
            ['Add: Write-offs', self._format_currency(trading.get('returns_adjustment', {}).get('write_offs', 0), currency_symbol)],
            ['<b>Total COGS</b>', f"<b>{self._format_currency(trading.get('cost_of_goods_sold', 0), currency_symbol)}</b>"],
            [''],
            ['<b>GROSS PROFIT</b>', f"<b>{self._format_currency(trading.get('gross_profit', 0), currency_symbol)}</b>"],
            ['Gross Profit Margin', f"{trading.get('gross_profit_margin', 0):.2f}%"],
        ]
        
        trading_table = Table(trading_data, colWidths=[4*inch, 2*inch])
        trading_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), TA_LEFT),
            ('ALIGN', (1, 0), (-1, -1), TA_RIGHT),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))
        story.append(trading_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Operating Expenses Section
        story.append(Paragraph("<b>OPERATING EXPENSES</b>", self.styles['Heading2']))
        op_expenses = self.pl_data.get('operating_expenses', {})
        
        op_data = [[f'Description', f'Amount ({currency_symbol})']]
        
        # Add expense categories
        for category in op_expenses.get('categories', []):
            op_data.append([
                category.get('name', ''),
                self._format_currency(category.get('amount', 0), currency_symbol)
            ])
        
        # Get total - handle Decimal type
        op_expenses_total = op_expenses.get('total', 0)
        if hasattr(op_expenses_total, '__float__'):
            op_expenses_total = float(op_expenses_total)
        
        op_data.append([
            '<b>Total Operating Expenses</b>',
            f"<b>{self._format_currency(op_expenses_total, currency_symbol)}</b>"
        ])
        
        op_table = Table(op_data, colWidths=[4*inch, 2*inch])
        op_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), TA_LEFT),
            ('ALIGN', (1, 0), (-1, -1), TA_RIGHT),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -2), colors.lightgrey),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e8e8e8')),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))
        story.append(op_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Taxes Section
        story.append(Paragraph("<b>TAXES</b>", self.styles['Heading2']))
        taxes = self.pl_data.get('taxes', {})
        
        tax_data = [[f'Description', f'Amount ({currency_symbol})']]
        
        for category in taxes.get('categories', []):
            tax_data.append([
                category.get('name', ''),
                self._format_currency(category.get('amount', 0), currency_symbol)
            ])
        
        # Get total - handle Decimal type
        taxes_total = taxes.get('total', 0)
        if hasattr(taxes_total, '__float__'):
            taxes_total = float(taxes_total)
        
        tax_data.append([
            '<b>Total Taxes</b>',
            f"<b>{self._format_currency(taxes_total, currency_symbol)}</b>"
        ])
        
        tax_table = Table(tax_data, colWidths=[4*inch, 2*inch])
        tax_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), TA_LEFT),
            ('ALIGN', (1, 0), (-1, -1), TA_RIGHT),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -2), colors.lightgrey),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e8e8e8')),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))
        story.append(tax_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Summary Section
        story.append(Paragraph("<b>SUMMARY</b>", self.styles['Heading2']))
        summary = self.pl_data.get('summary', {})
        
        summary_data = [
            [f'Description', f'Amount ({currency_symbol})'],
            ['Gross Profit', self._format_currency(summary.get('gross_profit', 0), currency_symbol)],
            ['Less: Operating Expenses', f"({self._format_currency(summary.get('operating_expenses_total', 0), currency_symbol)})"],
            ['<b>Operating Profit</b>', f"<b>{self._format_currency(summary.get('operating_profit', 0), currency_symbol)}</b>"],
            ['Add: Other Income', self._format_currency(summary.get('other_income_total', 0), currency_symbol)],
            ['Less: Other Expenses', f"({self._format_currency(summary.get('other_expenses_total', 0), currency_symbol)})"],
            ['<b>Profit Before Tax</b>', f"<b>{self._format_currency(summary.get('profit_before_tax', 0), currency_symbol)}</b>"],
            ['Less: Taxes', f"({self._format_currency(summary.get('taxes_total', 0), currency_symbol)})"],
            ['', ''],
            ['<b>NET PROFIT</b>', f"<b>{self._format_currency(summary.get('net_profit', 0), currency_symbol)}</b>"],
            ['', ''],
            ['Profit Margins', ''],
            [f"Gross Profit Margin: {summary.get('margins', {}).get('gross_profit_margin', 0):.2f}%", ''],
            [f"Operating Profit Margin: {summary.get('margins', {}).get('operating_profit_margin', 0):.2f}%", ''],
            [f"Net Profit Margin: {summary.get('margins', {}).get('net_profit_margin', 0):.2f}%", ''],
        ]
        
        summary_table = Table(summary_data, colWidths=[4*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), TA_LEFT),
            ('ALIGN', (1, 0), (-1, -1), TA_RIGHT),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -4), colors.beige),
            ('BACKGROUND', (0, -3), (-1, -1), colors.HexColor('#f0f0f0')),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('LINEBELOW', (0, 8), (-1, 8), 2, colors.black),
            ('LINEBELOW', (0, 9), (-1, 9), 3, colors.HexColor('#2c3e50')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))
        story.append(summary_table)
        
        # Signature Section
        story.append(Spacer(1, 0.5*inch))
        
        signature_style = ParagraphStyle(
            'Signature',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_LEFT
        )
        
        # Try to load signature images
        prepared_sig_img = None
        checked_sig_img = None
        approved_sig_img = None
        
        if hasattr(self.tenant, 'prepared_by_signature') and self.tenant.prepared_by_signature:
            try:
                prepared_sig_path = self.tenant.prepared_by_signature.path
                if os.path.exists(prepared_sig_path):
                    prepared_sig_img = Image(prepared_sig_path, width=2*inch, height=0.5*inch)
            except Exception:
                pass
        
        if hasattr(self.tenant, 'manager_signature') and self.tenant.manager_signature:
            try:
                checked_sig_path = self.tenant.manager_signature.path
                if os.path.exists(checked_sig_path):
                    checked_sig_img = Image(checked_sig_path, width=2*inch, height=0.5*inch)
            except Exception:
                pass
        
        if hasattr(self.tenant, 'approved_by_signature') and self.tenant.approved_by_signature:
            try:
                approved_sig_path = self.tenant.approved_by_signature.path
                if os.path.exists(approved_sig_path):
                    approved_sig_img = Image(approved_sig_path, width=2*inch, height=0.5*inch)
            except Exception:
                pass
        
        # Build signature section - use separate layout to avoid Image justification issues
        # Labels row
        labels_data = [[
            Paragraph('Prepared by:', self.styles['Normal']),
            Paragraph('Checked by:', self.styles['Normal']),
            Paragraph('Approved by:', self.styles['Normal'])
        ]]
        labels_table = Table(labels_data, colWidths=[2*inch, 2*inch, 2*inch])
        labels_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), TA_LEFT),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(labels_table)
        story.append(Spacer(1, 0.1*inch))
        
        # Signature images row - Use custom Flowable to draw images directly on canvas
        # This completely bypasses tables and avoids justification issues
        class SignatureImagesFlowable(Flowable):
            """Custom flowable to place signature images without table justification."""
            def __init__(self, images):
                Flowable.__init__(self)
                self.images = images or []
                self.height = 0.6*inch
                self.width = 6.5*inch
            
            def wrap(self, availWidth, availHeight):
                """Return size of flowable."""
                return (self.width, self.height)
            
            def draw(self):
                """Draw images directly on canvas at relative positions."""
                if not self.images:
                    return
                
                canvas = self.canv
                col_width = 2*inch
                x_offset = 0.5*inch  # Left margin
                y_offset = 0  # Top of flowable
                
                for i, img in enumerate(self.images):
                    if img and isinstance(img, Image):
                        try:
                            # Calculate x position relative to flowable start
                            x_pos = x_offset + (i * col_width)
                            # Draw image at relative position within flowable
                            img.drawOn(canvas, x_pos, y_offset)
                        except Exception as e:
                            # If image drawing fails, skip it silently
                            # Log error for debugging if needed
                            pass
        
        # Create signature images flowable
        sig_images = [prepared_sig_img, checked_sig_img, approved_sig_img]
        sig_flowable = SignatureImagesFlowable(sig_images)
        story.append(sig_flowable)
        story.append(Spacer(1, 0.2*inch))
        
        # Names row
        names_data = [[
            Paragraph('Name: ___________________', self.styles['Normal']),
            Paragraph('Name: ___________________', self.styles['Normal']),
            Paragraph('Name: ___________________', self.styles['Normal'])
        ]]
        names_table = Table(names_data, colWidths=[2*inch, 2*inch, 2*inch])
        names_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), TA_LEFT),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(names_table)
        story.append(Spacer(1, 0.1*inch))
        
        # Dates row
        dates_data = [[
            Paragraph('Date: ___________________', self.styles['Normal']),
            Paragraph('Date: ___________________', self.styles['Normal']),
            Paragraph('Date: ___________________', self.styles['Normal'])
        ]]
        dates_table = Table(dates_data, colWidths=[2*inch, 2*inch, 2*inch])
        dates_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), TA_LEFT),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(dates_table)
        
        # Footer
        story.append(Spacer(1, 0.3*inch))
        generated_at = datetime.now().strftime("%B %d, %Y at %I:%M %p")
        footer_style = ParagraphStyle(
            'Footer',
            parent=self.styles['Normal'],
            fontSize=9,
            alignment=TA_CENTER,
            textColor=colors.grey
        )
        story.append(Paragraph(f"Generated on: {generated_at}", footer_style))
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def _format_currency(self, value, currency_symbol='$'):
        """Format number as currency."""
        try:
            if isinstance(value, str):
                value = float(value)
            return f"{currency_symbol}{abs(value):,.2f}"
        except (ValueError, TypeError):
            return f"{currency_symbol}0.00"

