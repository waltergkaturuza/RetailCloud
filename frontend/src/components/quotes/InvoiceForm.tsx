/**
 * Invoice Form Component (similar to QuotationForm)
 */
import QuotationForm from './QuotationForm'

// InvoiceForm is very similar to QuotationForm, so we'll reuse most of the logic
// For now, we'll create a simple wrapper that adapts the QuotationForm
export default function InvoiceForm({ invoice, onClose, onSuccess }: any) {
  // Convert invoice to quotation format for the form
  const quotationData = invoice ? {
    ...invoice,
    valid_until: invoice.due_date,
    quotation_date: invoice.invoice_date,
  } : null

  return (
    <QuotationForm
      quotation={quotationData}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}

