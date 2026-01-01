import Button from '../ui/Button'
import Card from '../ui/Card'

interface ReturnDetailsModalProps {
  returnData: any
  returnType: 'sale' | 'purchase'
  onClose: () => void
  onApprove: (id: number) => void
  onReject: (id: number) => void
  onProcess: (id: number) => void
  isSupervisor: boolean
}

export default function ReturnDetailsModal({
  returnData,
  returnType,
  onClose,
  onApprove,
  onReject,
  onProcess,
  isSupervisor
}: ReturnDetailsModalProps) {
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: { bg: string; color: string } } = {
      pending: { bg: '#fff3cd', color: '#856404' },
      approved: { bg: '#d4edda', color: '#155724' },
      processed: { bg: '#cce5ff', color: '#004085' },
      rejected: { bg: '#f8d7da', color: '#721c24' },
      cancelled: { bg: '#e2e3e5', color: '#383d41' },
      received_by_supplier: { bg: '#d1ecf1', color: '#0c5460' },
    }
    return colors[status] || { bg: '#e2e3e5', color: '#383d41' }
  }

  const statusStyle = getStatusColor(returnData.status)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>
            {returnType === 'sale' ? 'Customer Return' : 'Supplier Return'} Details
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7f8c8d' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>Return Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div><strong>Return Number:</strong> <span style={{ fontFamily: 'monospace' }}>{returnData.return_number}</span></div>
              {returnType === 'sale' ? (
                <>
                  <div><strong>Sale Invoice:</strong> <span style={{ fontFamily: 'monospace' }}>{returnData.sale_invoice_number}</span></div>
                  <div><strong>Customer:</strong> {returnData.customer_name || 'Walk-in'}</div>
                </>
              ) : (
                <>
                  <div><strong>PO Number:</strong> <span style={{ fontFamily: 'monospace' }}>{returnData.purchase_order_number}</span></div>
                  <div><strong>Supplier:</strong> {returnData.supplier_name}</div>
                </>
              )}
              <div><strong>Branch:</strong> {returnData.branch_name}</div>
              <div><strong>Date:</strong> {new Date(returnData.date).toLocaleString()}</div>
              <div><strong>Reason:</strong> {returnData.return_reason?.replace('_', ' ') || 'N/A'}</div>
              <div><strong>Status:</strong>
                <span
                  style={{
                    marginLeft: '8px',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: statusStyle.bg,
                    color: statusStyle.color,
                    textTransform: 'capitalize'
                  }}
                >
                  {returnData.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>Totals</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>${parseFloat(returnData.subtotal || '0').toFixed(2)}</span>
              </div>
              {returnData.tax_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tax:</span>
                  <span>${parseFloat(returnData.tax_amount || '0').toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '600', paddingTop: '8px', borderTop: '1px solid #ecf0f1' }}>
                <span>Total:</span>
                <span style={{ color: '#e74c3c' }}>${parseFloat(returnData.total_amount || '0').toFixed(2)}</span>
              </div>
              {returnType === 'sale' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span>Refund Method:</span>
                  <span style={{ textTransform: 'capitalize' }}>{returnData.refund_method?.replace('_', ' ')}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Items */}
        {returnData.items && returnData.items.length > 0 && (
          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Returned Items</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="table-header">Product</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Quantity</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Unit Price</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Total</th>
                    <th className="table-header">Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {returnData.items.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.product_name || 'N/A'}</td>
                      <td style={{ textAlign: 'right' }}>{item.quantity_returned || item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>${parseFloat(item.unit_price || '0').toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>${parseFloat(item.total || '0').toFixed(2)}</td>
                      <td>
                        <span style={{ textTransform: 'capitalize' }}>
                          {item.condition?.replace('_', ' ') || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Additional Info */}
        {returnData.reason_details && (
          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>Reason Details</h3>
            <p style={{ margin: 0, color: '#7f8c8d', whiteSpace: 'pre-wrap' }}>{returnData.reason_details}</p>
          </Card>
        )}

        {returnData.notes && (
          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>Notes</h3>
            <p style={{ margin: 0, color: '#7f8c8d', whiteSpace: 'pre-wrap' }}>{returnData.notes}</p>
          </Card>
        )}

        {/* Approval Info */}
        {returnData.processed_by_name && (
          <Card>
            <div style={{ fontSize: '14px' }}>
              <strong>Processed by:</strong> {returnData.processed_by_name || returnData.created_by_name}
            </div>
            {returnData.approved_by_name && (
              <div style={{ fontSize: '14px', marginTop: '8px' }}>
                <strong>Approved by:</strong> {returnData.approved_by_name}
                {returnData.approved_at && (
                  <span style={{ color: '#7f8c8d', marginLeft: '8px' }}>
                    on {new Date(returnData.approved_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}
            {returnData.rejection_reason && (
              <div style={{ fontSize: '14px', marginTop: '8px', color: '#e74c3c' }}>
                <strong>Rejection Reason:</strong> {returnData.rejection_reason}
              </div>
            )}
          </Card>
        )}

        {/* Actions */}
        <div style={{ 
          marginTop: '32px', 
          paddingTop: '24px',
          borderTop: '2px solid #ecf0f1',
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end' 
        }}>
          {returnData.status === 'pending' && isSupervisor && (
            <>
              <Button 
                variant="primary"
                onClick={() => onApprove(returnData.id)}
              >
                Approve
              </Button>
              <Button 
                variant="danger"
                onClick={() => {
                  const reason = prompt('Please provide a reason for rejection:')
                  if (reason) {
                    onReject(returnData.id)
                  }
                }}
              >
                Reject
              </Button>
            </>
          )}
          {(returnData.status === 'approved' || (returnData.status === 'pending' && !isSupervisor && returnType === 'sale')) && (
            <Button 
              variant="primary"
              onClick={() => onProcess(returnData.id)}
            >
              Process Return
            </Button>
          )}
          <Button onClick={onClose} variant="secondary">Close</Button>
        </div>
      </div>
    </div>
  )
}



