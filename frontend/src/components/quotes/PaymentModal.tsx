/**
 * Payment Recording Modal
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Invoice {
  id: number
  invoice_number: string
  total_amount: number
  paid_amount: number
  balance_due: number
  currency: string
}

interface PaymentModalProps {
  invoice: Invoice
  onClose: () => void
  onSuccess: () => void
}

export default function PaymentModal({ invoice, onClose, onSuccess }: PaymentModalProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    amount: invoice.balance_due,
    payment_method: 'cash',
    reference: '',
    notes: '',
  })

  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/quotes/invoices/${invoice.id}/record_payment/`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Payment recorded successfully')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to record payment')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.amount <= 0) {
      toast.error('Payment amount must be greater than 0')
      return
    }
    if (formData.amount > invoice.balance_due) {
      toast.error(`Payment amount cannot exceed balance due (${invoice.currency} ${invoice.balance_due.toFixed(2)})`)
      return
    }
    paymentMutation.mutate(formData)
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={`Record Payment - ${invoice.invoice_number}`}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Payment Date *
            </label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Amount *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              className="input"
              min="0.01"
              max={invoice.balance_due}
              step="0.01"
              required
            />
            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
              Balance due: {invoice.currency} {invoice.balance_due.toFixed(2)}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Payment Method *
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="input"
              required
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Credit/Debit Card</option>
              <option value="ecocash">EcoCash</option>
              <option value="onemoney">OneMoney</option>
              <option value="telecash">Telecash</option>
              <option value="zipit">ZIPIT</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Reference Number
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              className="input"
              placeholder="Transaction reference, check number, etc."
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows={3}
              placeholder="Additional payment notes"
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={paymentMutation.isPending}>
              {paymentMutation.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

