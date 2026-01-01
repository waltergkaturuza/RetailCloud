import { useState, useRef } from 'react';
import { exportToExcel, exportToCSV, importFromExcel, importFromCSV } from '../utils/export';
import Button from './ui/Button';
import Card from './ui/Card';

interface ExportImportProps {
  data: any[];
  filename: string;
  onImport?: (data: any[]) => void;
  columns?: Array<{ key: string; label: string }>;
}

export default function ExportImport({ data, filename, onImport, columns }: ExportImportProps) {
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = () => {
    exportToExcel(data, { filename });
  };

  const handleExportCSV = () => {
    exportToCSV(data, { filename });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);

    try {
      let importedData: any[];

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        importedData = await importFromExcel(file);
      } else if (file.name.endsWith('.csv')) {
        importedData = await importFromCSV(file);
      } else {
        throw new Error('Unsupported file format. Please use Excel (.xlsx, .xls) or CSV (.csv) files.');
      }

      if (onImport) {
        onImport(importedData);
      }
    } catch (error: any) {
      setImportError(error.message || 'Failed to import file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Export/Import</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#7f8c8d' }}>
            Export data or import from file
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            size="sm"
            variant="primary"
            onClick={handleExportExcel}
            disabled={!data || data.length === 0}
          >
            📥 Export Excel
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleExportCSV}
            disabled={!data || data.length === 0}
          >
            📥 Export CSV
          </Button>

          {onImport && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImport}
                style={{ display: 'none' }}
                id="import-file-input"
              />
              <label htmlFor="import-file-input">
                <Button
                  size="sm"
                  variant="secondary"
                  as="span"
                  isLoading={importing}
                >
                  📤 Import
                </Button>
              </label>
            </>
          )}
        </div>
      </div>

      {importError && (
        <div style={{
          marginTop: '12px',
          padding: '10px',
          background: '#fee',
          color: '#c33',
          borderRadius: '6px',
          fontSize: '13px'
        }}>
          {importError}
        </div>
      )}

      {data && data.length > 0 && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#7f8c8d'
        }}>
          {data.length} {data.length === 1 ? 'record' : 'records'} ready for export
        </div>
      )}
    </Card>
  );
}




