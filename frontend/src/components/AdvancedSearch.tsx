import { useState } from 'react';
import Button from './ui/Button';
import Card from './ui/Card';

interface AdvancedSearchProps {
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select';
    options?: Array<{ value: string; label: string }>;
  }>;
  onSearch: (filters: Record<string, any>) => void;
  onReset: () => void;
}

export default function AdvancedSearch({ fields, onSearch, onReset }: AdvancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const handleChange = (fieldName: string, value: any) => {
    setFilters({ ...filters, [fieldName]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clean up filters: remove empty strings and null values
    const cleanedFilters: Record<string, any> = {};
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== '' && value !== null && value !== undefined) {
        cleanedFilters[key] = value;
      }
    });
    onSearch(cleanedFilters);
  };

  const handleReset = () => {
    setFilters({});
    onReset();
    setIsOpen(false);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '10px 16px',
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          color: '#495057',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: isOpen ? '16px' : '0',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#e9ecef'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f8f9fa'
        }}
      >
        <span>🔍</span>
        <span>Advanced Search</span>
        <span>{isOpen ? '▼' : '▶'}</span>
      </button>

      {isOpen && (
        <Card style={{ marginTop: '10px', padding: '20px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px',
              marginBottom: '16px'
            }}>
              {fields.map((field) => (
                <div key={field.name}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    fontSize: '13px',
                    color: '#555'
                  }}>
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={filters[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: 'white'
                      }}
                    >
                      <option value="">All</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'date' ? (
                    <input
                      type="date"
                      value={filters[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  ) : field.type === 'number' ? (
                    <input
                      type="number"
                      value={filters[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={filters[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                      placeholder={`Filter by ${field.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={handleReset}>
                Reset
              </Button>
              <Button type="submit" variant="primary">
                Apply Filters
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}


