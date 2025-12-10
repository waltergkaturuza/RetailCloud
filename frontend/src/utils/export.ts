/**
 * Export utilities for Excel/CSV export
 */
import * as XLSX from 'xlsx';

export interface ExportOptions {
  filename?: string;
  sheetName?: string;
  dateFormat?: string;
}

/**
 * Export data to Excel file
 */
export function exportToExcel(
  data: any[],
  options: ExportOptions = {}
): void {
  const {
    filename = 'export',
    sheetName = 'Sheet1',
    dateFormat = 'yyyy-mm-dd'
  } = options;

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  const maxWidth = 50;
  const cols = Object.keys(data[0] || {}).map(key => ({
    wch: Math.min(
      Math.max(key.length, ...data.map(row => String(row[key] || '').length)),
      maxWidth
    )
  }));
  ws['!cols'] = cols;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate file and download
  const fileName = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export data to CSV file
 */
export function exportToCSV(
  data: any[],
  options: { filename?: string; delimiter?: string } = {}
): void {
  const { filename = 'export', delimiter = ',' } = options;

  if (data.length === 0) {
    console.error('No data to export');
    return;
  }

  // Get headers
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(delimiter),
    ...data.map(row =>
      headers
        .map(header => {
          const value = row[header];
          // Handle special characters and quotes
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(delimiter)
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import from Excel file
 */
export function importFromExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Failed to parse Excel file: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Import from CSV file
 */
export function importFromCSV(file: File, delimiter = ','): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          resolve([]);
          return;
        }
        
        // Parse headers
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        
        // Parse data rows
        const data = lines.slice(1).map(line => {
          const values = line.split(delimiter);
          const row: any = {};
          headers.forEach((header, index) => {
            let value = values[index]?.trim() || '';
            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1).replace(/""/g, '"');
            }
            row[header] = value;
          });
          return row;
        });
        
        resolve(data);
      } catch (error) {
        reject(new Error('Failed to parse CSV file: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}


