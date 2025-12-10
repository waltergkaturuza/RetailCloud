import { useRef, useEffect, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import Button from './ui/Button';
import api from '../lib/api';

interface ReceiptProps {
  sale: any;
  onClose?: () => void;
}

interface ReceiptTemplate {
  logo_url?: string;
  show_logo: boolean;
  show_company_name: boolean;
  show_address: boolean;
  show_phone: boolean;
  show_email: boolean;
  show_vat_number: boolean;
  show_item_description: boolean;
  show_item_sku: boolean;
  show_item_barcode: boolean;
  show_item_tax: boolean;
  show_item_discount: boolean;
  footer_text: string;
  show_qr_code: boolean;
  qr_code_data: string;
  show_zimra_info: boolean;
  fiscal_number_label: string;
  device_code_label: string;
  header_text: string;
  receipt_width: number;
  font_size: number;
}

export default function Receipt({ sale, onClose }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [printType, setPrintType] = useState<'original' | 'duplicate' | 'reprint'>('original')

  // Fetch receipt template
  const { data: template } = useQuery<ReceiptTemplate>({
    queryKey: ['receipt-template-default'],
    queryFn: async () => {
      try {
        const response = await api.get('/receipts/templates/default/')
        return response.data
      } catch {
        return {
          show_logo: true,
          show_company_name: true,
          show_address: true,
          show_phone: true,
          show_vat_number: true,
          show_item_description: true,
          footer_text: 'Thank you for your business!\nNo refunds after 7 days.',
          show_qr_code: true,
          show_zimra_info: true,
          fiscal_number_label: 'Fiscal Invoice No:',
          device_code_label: 'Device Code:',
          receipt_width: 80,
          font_size: 12
        }
      }
    }
  })

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Receipt-${sale.invoice_number}`,
    onAfterPrint: () => {
      // Log print
      if (sale.id && !sale.is_offline) {
        api.post('/receipts/log-print/', {
          sale_id: sale.id,
          print_type: printType
        }).catch(err => console.error('Failed to log print:', err))
      }
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'ZWL': 'Z$',
      'ZAR': 'R'
    }
    return symbols[currency] || '$'
  }

  const qrCodeData = template?.qr_code_data 
    ? template.qr_code_data
        .replace('{invoice_number}', sale.invoice_number || '')
        .replace('{date}', sale.date || '')
        .replace('{amount}', sale.total_amount || '0')
    : `${sale.invoice_number || ''}|${sale.date || ''}|${sale.total_amount || '0'}`

  const receiptWidth = template?.receipt_width || 80
  const fontSize = template?.font_size || 12

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Receipt</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={printType}
              onChange={(e) => setPrintType(e.target.value as any)}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            >
              <option value="original">Original</option>
              <option value="duplicate">Duplicate</option>
              <option value="reprint">Reprint</option>
            </select>
            <Button onClick={handlePrint} variant="primary">
              🖨️ Print
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="secondary">
                Close
              </Button>
            )}
          </div>
        </div>

        <div ref={receiptRef} style={{
          padding: '20px',
          background: 'white',
          fontFamily: 'monospace',
          fontSize: `${fontSize}px`,
          lineHeight: '1.6',
          width: `${receiptWidth}mm`,
          maxWidth: '100%',
          margin: '0 auto',
        }}>
          {/* Logo & Header */}
          {template?.show_logo && template?.logo_url && (
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <img 
                src={template.logo_url} 
                alt="Logo" 
                style={{ maxWidth: '150px', maxHeight: '80px' }}
              />
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px dashed #000', paddingBottom: '15px' }}>
            {template?.header_text ? (
              <div style={{ whiteSpace: 'pre-line' }}>{template.header_text}</div>
            ) : (
              <>
                {template?.show_company_name !== false && (
                  <h2 style={{ margin: '0 0 8px 0', fontSize: `${fontSize + 4}px`, fontWeight: 'bold' }}>
                    {sale.tenant_company_name || 'STORE'}
                  </h2>
                )}
                {template?.show_address !== false && (sale.tenant_address || sale.tenant_city || sale.tenant_country) && (
                  <div style={{ fontSize: `${fontSize - 2}px`, color: '#666', marginBottom: '4px' }}>
                    {sale.tenant_address && <>{sale.tenant_address}<br /></>}
                    {sale.tenant_city && sale.tenant_country ? (
                      <>{sale.tenant_city}, {sale.tenant_country}</>
                    ) : sale.tenant_city || sale.tenant_country}
                  </div>
                )}
                {template?.show_phone !== false && sale.tenant_phone && (
                  <div style={{ fontSize: `${fontSize - 2}px`, color: '#666' }}>
                    Phone: {sale.tenant_phone}
                  </div>
                )}
                {template?.show_email !== false && sale.tenant_email && (
                  <div style={{ fontSize: `${fontSize - 2}px`, color: '#666' }}>
                    {sale.tenant_email}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Receipt Details */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Invoice:</span>
              <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{sale.invoice_number || sale.local_id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Date:</span>
              <span>{formatDate(sale.date || sale.created_at || new Date().toISOString())}</span>
            </div>
            {sale.is_offline && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '5px',
                padding: '4px 8px',
                background: '#fff3cd',
                borderRadius: '4px',
                fontSize: `${fontSize - 2}px`
              }}>
                <span style={{ fontWeight: '600' }}>⚠️ OFFLINE SALE</span>
              </div>
            )}
            {template?.show_zimra_info && sale.fiscal_number && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>{template.fiscal_number_label || 'Fiscal Invoice No:'}</span>
                <span style={{ fontFamily: 'monospace' }}>{sale.fiscal_number}</span>
              </div>
            )}
            {template?.show_zimra_info && sale.device_code && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>{template.device_code_label || 'Device Code:'}</span>
                <span style={{ fontFamily: 'monospace' }}>{sale.device_code}</span>
              </div>
            )}
            {sale.customer_name && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Customer:</span>
                <span>{sale.customer_name}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Cashier:</span>
              <span>{sale.cashier_name || 'System'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Payment:</span>
              <span style={{ textTransform: 'capitalize' }}>{sale.payment_method || 'Cash'}</span>
            </div>
            {sale.payment_splits && sale.payment_splits.length > 0 && (
              <div style={{ marginTop: '8px', padding: '8px', background: '#f8f9fa', borderRadius: '4px', fontSize: `${fontSize - 2}px` }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Payment Split:</div>
                {sale.payment_splits.map((split: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{split.payment_method} ({split.currency}):</span>
                    <span>{getCurrencySymbol(split.currency)}{parseFloat(split.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items */}
          <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '15px 0', marginBottom: '15px' }}>
            {sale.items?.map((item: any, idx: number) => (
              <div key={idx} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '500' }}>
                    {template?.show_item_description !== false && item.product_name}
                  </span>
                  <span style={{ fontWeight: '600' }}>
                    {getCurrencySymbol(sale.currency || 'USD')}{parseFloat(item.total).toFixed(2)}
                  </span>
                </div>
                <div style={{ fontSize: `${fontSize - 2}px`, color: '#666', paddingLeft: '10px' }}>
                  {item.quantity} × {getCurrencySymbol(sale.currency || 'USD')}{parseFloat(item.unit_price).toFixed(2)}
                  {template?.show_item_sku && item.product_sku && (
                    <span> | SKU: {item.product_sku}</span>
                  )}
                  {template?.show_item_tax !== false && item.tax_amount > 0 && (
                    <span> | Tax: {getCurrencySymbol(sale.currency || 'USD')}{parseFloat(item.tax_amount).toFixed(2)}</span>
                  )}
                  {template?.show_item_discount !== false && item.discount_amount > 0 && (
                    <span style={{ color: '#e74c3c' }}> | -{getCurrencySymbol(sale.currency || 'USD')}{parseFloat(item.discount_amount).toFixed(2)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Subtotal:</span>
              <span>{getCurrencySymbol(sale.currency || 'USD')}{parseFloat(sale.subtotal || 0).toFixed(2)}</span>
            </div>
            {sale.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#e74c3c' }}>
                <span>Discount:</span>
                <span>-{getCurrencySymbol(sale.currency || 'USD')}{parseFloat(sale.discount_amount).toFixed(2)}</span>
              </div>
            )}
            {sale.tax_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Tax (VAT):</span>
                <span>{getCurrencySymbol(sale.currency || 'USD')}{parseFloat(sale.tax_amount).toFixed(2)}</span>
              </div>
            )}
            {template?.show_zimra_info && sale.vat_amount && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: `${fontSize - 1}px` }}>
                <span>VAT Amount:</span>
                <span>{getCurrencySymbol(sale.currency || 'USD')}{parseFloat(sale.vat_amount).toFixed(2)}</span>
              </div>
            )}
            {template?.show_zimra_info && sale.aids_levy && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: `${fontSize - 1}px` }}>
                <span>AIDS Levy:</span>
                <span>{getCurrencySymbol(sale.currency || 'USD')}{parseFloat(sale.aids_levy).toFixed(2)}</span>
              </div>
            )}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '2px solid #000',
              fontSize: `${fontSize + 2}px`,
              fontWeight: 'bold'
            }}>
              <span>TOTAL:</span>
              <span>{getCurrencySymbol(sale.currency || 'USD')}{parseFloat(sale.total_amount).toFixed(2)}</span>
            </div>
            {sale.change_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <span>Change:</span>
                <span>{getCurrencySymbol(sale.currency || 'USD')}{parseFloat(sale.change_amount).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* QR Code */}
          {template?.show_qr_code && (
            <div style={{ textAlign: 'center', marginBottom: '15px', padding: '10px', background: '#f8f9fa' }}>
              <QRCodeSVG value={qrCodeData} size={120} />
              <div style={{ marginTop: '8px', fontSize: `${fontSize - 2}px`, color: '#666' }}>
                Scan to verify receipt
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ 
            textAlign: 'center', 
            borderTop: '1px dashed #000',
            paddingTop: '15px',
            fontSize: `${fontSize - 1}px`,
            color: '#666',
            whiteSpace: 'pre-line'
          }}>
            {template?.footer_text || 'Thank you for your business!\nNo refunds after 7 days.'}
          </div>

          {printType !== 'original' && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '10px',
              fontSize: `${fontSize - 2}px`,
              color: '#999',
              fontStyle: 'italic'
            }}>
              {printType.toUpperCase()} COPY
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
