/**
 * Serial Number Capture Modal for Sales/POS
 * Integrates OCR and pattern recognition for quick serial entry
 */
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../../lib/api'
import Button from '../ui/Button'
import BulkSerialImport from './BulkSerialImport'
import toast from 'react-hot-toast'

interface SerialCaptureModalProps {
  productId: number
  productName: string
  quantity: number
  onCapture: (serials: string[]) => void
  onClose: () => void
}

export default function SerialCaptureModal({
  productId,
  productName,
  quantity,
  onCapture,
  onClose,
}: SerialCaptureModalProps) {
  const [capturedSerials, setCapturedSerials] = useState<string[]>([])
  const [manualSerials, setManualSerials] = useState<string[]>([])

  const handleImportComplete = (serials: string[]) => {
    setCapturedSerials([...capturedSerials, ...serials])
  }

  const handleManualAdd = () => {
    const input = prompt(`Enter serial number (${capturedSerials.length + manualSerials.length + 1}/${quantity}):`)
    if (input && input.trim()) {
      setManualSerials([...manualSerials, input.trim()])
    }
  }

  const handleRemove = (index: number, isManual: boolean) => {
    if (isManual) {
      setManualSerials(manualSerials.filter((_, i) => i !== index))
    } else {
      setCapturedSerials(capturedSerials.filter((_, i) => i !== index))
    }
  }

  const handleConfirm = () => {
    const allSerials = [...capturedSerials, ...manualSerials]
    if (allSerials.length !== quantity) {
      toast.error(`Please capture ${quantity} serial number(s). Currently: ${allSerials.length}`)
      return
    }
    onCapture(allSerials)
    onClose()
  }

  const allSerials = [...capturedSerials, ...manualSerials]
  const remaining = quantity - allSerials.length

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px' }}>📸 Capture Serial Numbers</h2>
              <p style={{ margin: '8px 0 0', color: '#666' }}>
                Product: <strong>{productName}</strong> | Required: {quantity}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '28px',
                cursor: 'pointer',
                color: '#999',
              }}
            >
              ×
            </button>
          </div>

          {/* Progress */}
          <div
            style={{
              background: '#f0f0f0',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: remaining === 0 ? '#27ae60' : '#3498db' }}>
              {allSerials.length} / {quantity}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              {remaining === 0
                ? '✅ All serials captured!'
                : `${remaining} serial number(s) remaining`}
            </div>
          </div>

          {/* Bulk Import Section */}
          <div style={{ marginBottom: '24px' }}>
            <BulkSerialImport
              productId={productId}
              onImportComplete={handleImportComplete}
            />
          </div>

          {/* Manual Entry */}
          <div style={{ marginBottom: '24px' }}>
            <Button onClick={handleManualAdd} variant="secondary">
              ➕ Add Serial Manually
            </Button>
          </div>

          {/* Captured Serials List */}
          {allSerials.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '12px' }}>Captured Serials:</h3>
              <div
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {allSerials.map((serial, index) => {
                  const isManual = index >= capturedSerials.length
                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        borderBottom: index < allSerials.length - 1 ? '1px solid #eee' : 'none',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                        {isManual ? '✋' : '🤖'} {serial}
                      </span>
                      <button
                        onClick={() => handleRemove(index - (isManual ? capturedSerials.length : 0), isManual)}
                        style={{
                          background: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={allSerials.length !== quantity}
              variant="primary"
            >
              ✅ Confirm ({allSerials.length}/{quantity})
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

