import { useState } from 'react';

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
    onSearch(filters);
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
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: isOpen ? '16px' : '0' }}
      >
        🔍 Advanced Search {isOpen ? '▼' : '▶'}
      </button>

      {isOpen && (
        <div className="card" style={{ marginTop: '10px' }}>
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
                      className="input"
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
                      className="input"
                    />
                  ) : field.type === 'number' ? (
                    <input
                      type="number"
                      value={filters[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className="input"
                    />
                  ) : (
                    <input
                      type="text"
                      value={filters[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className="input"
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
        </div>
      )}
    </div>
  );
}

