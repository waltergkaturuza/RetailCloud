import { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import Button from './ui/Button';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  mode?: 'barcode' | 'rfid';
}

export default function BarcodeScanner({ onScan, onClose, mode = 'barcode' }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState('');
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (mode === 'rfid') {
      // For RFID, focus on manual entry input
      inputRef.current?.focus();
      return;
    }

    if (isScanning && videoRef.current) {
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      codeReaderRef.current
        .decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
          if (result) {
            onScan(result.getText());
            stopScanning();
          }
          if (err && !(err.name === 'NotFoundException')) {
            setError('Scanning error: ' + err.message);
          }
        })
        .catch((err) => {
          setError('Camera error: ' + err.message);
          setIsScanning(false);
        });
    }

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, [isScanning, onScan, mode]);

  const startScanning = () => {
    setError(null);
    setIsScanning(true);
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setIsScanning(false);
  };

  const handleManualEntry = () => {
    if (manualEntry.trim()) {
      onScan(manualEntry.trim());
      setManualEntry('');
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && manualEntry.trim()) {
      handleManualEntry();
    }
  };

  if (mode === 'rfid') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>📡</span>
            RFID Scanner
          </h2>
          
          <div style={{
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <p style={{ margin: '0 0 16px 0', color: '#7f8c8d', fontSize: '14px' }}>
              Enter or scan RFID tag identifier:
            </p>
            <input
              ref={inputRef}
              type="text"
              value={manualEntry}
              onChange={(e) => setManualEntry(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter RFID tag..."
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '18px',
                border: '2px solid #3498db',
                borderRadius: '8px',
                fontFamily: 'monospace',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
          </div>

          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
            <Button onClick={handleManualEntry} variant="primary" disabled={!manualEntry.trim()}>
              ✓ Confirm
            </Button>
            <Button onClick={onClose} variant="secondary">Cancel</Button>
          </div>

          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: '#e8f5e9',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#2e7d32'
          }}>
            <strong>Note:</strong> RFID tags can be entered manually or scanned using an RFID reader device connected to your system.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>📷</span>
          Barcode Scanner
        </h2>
        
        {error && (
          <div style={{
            padding: '12px',
            background: '#fee',
            color: '#c33',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div style={{
          background: '#000',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '20px',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              maxHeight: '500px',
              display: isScanning ? 'block' : 'none'
            }}
            autoPlay
            playsInline
          />
          {!isScanning && (
            <div style={{ color: 'white', textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📷</div>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>Camera Ready</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                Click "Start Scanning" to begin
              </div>
            </div>
          )}
          {isScanning && (
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(46, 204, 113, 0.9)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              🔴 Scanning...
            </div>
          )}
        </div>

        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            Or enter barcode manually:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              ref={inputRef}
              type="text"
              value={manualEntry}
              onChange={(e) => setManualEntry(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter barcode..."
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                fontFamily: 'monospace'
              }}
            />
            <Button 
              onClick={handleManualEntry} 
              variant="secondary"
              disabled={!manualEntry.trim()}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="flex gap-2" style={{ justifyContent: 'center' }}>
          {!isScanning ? (
            <>
              <Button onClick={startScanning} variant="primary" style={{ padding: '12px 24px' }}>
                📷 Start Scanning
              </Button>
              <Button onClick={onClose} variant="secondary">Close</Button>
            </>
          ) : (
            <>
              <Button onClick={stopScanning} variant="danger" style={{ padding: '12px 24px' }}>
                ⏸️ Stop Scanning
              </Button>
              <Button onClick={onClose} variant="secondary">Close</Button>
            </>
          )}
        </div>

        <div style={{
          marginTop: '20px',
          padding: '12px',
          background: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#7f8c8d'
        }}>
          <strong>Tips:</strong>
          <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
            <li>Ensure good lighting</li>
            <li>Hold the barcode steady and at a distance</li>
            <li>Keep the barcode centered in the camera frame</li>
            <li>You can also type the barcode manually</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

