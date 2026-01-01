/**
 * Bulk Serial Number Import Component with ML Pattern Recognition
 */
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../../lib/api'
import Button from '../ui/Button'
import Card from '../ui/Card'
import toast from 'react-hot-toast'

interface ExtractedSerial {
  serial: string
  confidence: number
  pattern?: string
  metadata?: Record<string, any>
}

interface BulkSerialImportProps {
  productId?: number
  onImportComplete?: (serials: string[]) => void
  onClose?: () => void
}

export default function BulkSerialImport({
  productId,
  onImportComplete,
  onClose,
}: BulkSerialImportProps) {
  const [inputText, setInputText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [extractedSerials, setExtractedSerials] = useState<ExtractedSerial[]>([])
  const [showResults, setShowResults] = useState(false)

  // Extract serials mutation
  const extractMutation = useMutation({
    mutationFn: async (data: { input_text?: string; image?: File; product_id?: number }) => {
      const formData = new FormData()
      if (data.input_text) {
        formData.append('input_text', data.input_text)
      }
      if (data.image) {
        formData.append('image', data.image)
      }
      if (data.product_id) {
        formData.append('product_id', data.product_id.toString())
      }

      const response = await api.post('/inventory/bulk/extract_serials/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    onSuccess: (data) => {
      setExtractedSerials(
        data.detailed_results?.map((r: any) => ({
          serial: r.serial,
          confidence: r.confidence,
          pattern: r.pattern,
          metadata: r.metadata,
        })) || []
      )
      setShowResults(true)
      toast.success(`Extracted ${data.extracted_serials?.length || 0} serial numbers!`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to extract serial numbers')
    },
  })

  // Process image mutation (comprehensive OCR)
  const processImageMutation = useMutation({
    mutationFn: async (data: { image: File; product_id?: number }) => {
      const formData = new FormData()
      formData.append('image', data.image)
      if (data.product_id) {
        formData.append('product_id', data.product_id.toString())
      }
      formData.append('extract_text', 'true')
      formData.append('extract_barcodes', 'true')
      formData.append('extract_serials', 'true')

      const response = await api.post('/inventory/bulk/process_image/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    onSuccess: (data) => {
      // Combine barcodes and serials
      const allCodes = [
        ...(data.barcodes || []),
        ...(data.serials?.map((s: any) => s.serial) || []),
      ]
      
      setExtractedSerials(
        (data.serials || []).map((s: any) => ({
          serial: s.serial,
          confidence: s.confidence,
          pattern: s.pattern,
          metadata: s.metadata,
        }))
      )
      
      if (allCodes.length > 0) {
        setShowResults(true)
        toast.success(`Extracted ${allCodes.length} codes from image!`)
      } else {
        toast.info('No codes found in image. Check OCR text preview.')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to process image')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleExtract = () => {
    if (imageFile) {
      processImageMutation.mutate({ image: imageFile, product_id: productId })
    } else if (inputText.trim()) {
      extractMutation.mutate({ input_text: inputText, product_id: productId })
    } else {
      toast.error('Please provide either text input or an image')
    }
  }

  const handleImport = () => {
    const serials = extractedSerials.map((e) => e.serial)
    if (onImportComplete) {
      onImportComplete(serials)
    }
    toast.success(`Imported ${serials.length} serial numbers!`)
    if (onClose) {
      onClose()
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#27ae60'
    if (confidence >= 0.6) return '#f39c12'
    return '#e74c3c'
  }

  return (
    <Card>
      <div style={{ padding: '24px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>🔍 Bulk Serial Number Import</h2>
        
        {/* Input Methods */}
        <div style={{ marginBottom: '24px' }}>
          {/* Text Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Text Input (e.g., "SN-1000, SN-1001, SN-1002 to SN-1010")
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste serial numbers here...&#10;Supports:&#10;- Comma separated: SN-1000, SN-1001, SN-1002&#10;- Ranges: SN-1000 to SN-1010&#10;- New lines"
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Or Upload Image (OCR Extraction)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ marginBottom: '12px' }}
            />
            {previewImage && (
              <div style={{ marginTop: '12px' }}>
                <img
                  src={previewImage}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Extract Button */}
        <div style={{ marginBottom: '24px' }}>
          <Button
            onClick={handleExtract}
            disabled={extractMutation.isPending || processImageMutation.isPending}
            style={{ marginRight: '12px' }}
          >
            {extractMutation.isPending || processImageMutation.isPending
              ? 'Processing...'
              : imageFile
              ? '🔍 Extract from Image (OCR)'
              : '🔍 Extract Serials'}
          </Button>
          {onClose && (
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>

        {/* Results */}
        {showResults && extractedSerials.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: 0 }}>
                Extracted: {extractedSerials.length} serial numbers
              </h3>
              <Button onClick={handleImport} variant="primary">
                ✅ Import All
              </Button>
            </div>

            {/* Statistics */}
            <div
              style={{
                background: '#f8f9fa',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '14px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <strong>High Confidence:</strong>{' '}
                  {extractedSerials.filter((e) => e.confidence >= 0.8).length}
                </div>
                <div>
                  <strong>Pattern Matched:</strong>{' '}
                  {extractedSerials.filter((e) => e.pattern).length}
                </div>
                <div>
                  <strong>Avg Confidence:</strong>{' '}
                  {(
                    extractedSerials.reduce((sum, e) => sum + e.confidence, 0) /
                    extractedSerials.length
                  ).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Serial List */}
            <div
              style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '12px',
              }}
            >
              <table style={{ width: '100%', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Serial</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Confidence</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Pattern</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedSerials.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                        {item.serial}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span
                          style={{
                            color: getConfidenceColor(item.confidence),
                            fontWeight: '600',
                          }}
                        >
                          {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td style={{ padding: '8px', fontSize: '12px', color: '#666' }}>
                        {item.pattern || 'Common format'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tips */}
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: '#e8f4f8',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          <strong>💡 Tips:</strong>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>For text: Use ranges (e.g., "SN-1000 to SN-1010") for fastest import</li>
            <li>For images: Ensure good lighting and clear text/barcodes</li>
            <li>Create serial patterns for even better recognition</li>
            <li>High confidence (&gt;80%) indicates reliable extraction</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}

