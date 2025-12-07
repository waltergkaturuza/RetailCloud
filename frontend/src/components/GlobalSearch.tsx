import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';


interface SearchResult {
  type: 'product' | 'customer' | 'sale' | 'supplier';
  id: number;
  title: string;
  subtitle?: string;
  route: string;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      
      const [products, customers, sales] = await Promise.all([
        api.get('/inventory/products/', { params: { search: query, limit: 5 } })
          .then(r => r.data.results || []).catch(() => []),
        api.get('/customers/customers/', { params: { search: query, limit: 5 } })
          .then(r => r.data.results || []).catch(() => []),
        api.get('/pos/sales/', { params: { search: query, limit: 5 } })
          .then(r => r.data.results || []).catch(() => []),
      ]);

      const searchResults: SearchResult[] = [
        ...products.map((p: any) => ({
          type: 'product' as const,
          id: p.id,
          title: p.name,
          subtitle: `SKU: ${p.sku}`,
          route: `/products`,
        })),
        ...customers.map((c: any) => ({
          type: 'customer' as const,
          id: c.id,
          title: `${c.first_name} ${c.last_name}`,
          subtitle: c.email || c.phone,
          route: `/customers`,
        })),
        ...sales.map((s: any) => ({
          type: 'sale' as const,
          id: s.id,
          title: `Invoice: ${s.invoice_number}`,
          subtitle: `$${parseFloat(s.total_amount).toFixed(2)}`,
          route: `/sales`,
        })),
      ];

      return searchResults.slice(0, 10);
    },
    enabled: query.length >= 2 && isOpen,
  });

  useEffect(() => {
    const handler = () => setIsOpen(true);
    try {
      window.addEventListener('openGlobalSearch', handler);
      return () => {
        try {
          window.removeEventListener('openGlobalSearch', handler);
        } catch (e) {
          // Ignore cleanup errors
        }
      };
    } catch (e) {
      // Ignore if event listener fails
      return () => {};
    }
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.route);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={() => setIsOpen(false)}
      style={{ zIndex: 9999 }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="modal-content"
        style={{ maxWidth: '600px', padding: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '16px' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products, customers, sales..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="input"
            style={{ fontSize: '18px', padding: '12px 16px' }}
          />
        </div>

        {query.length >= 2 && (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {isLoading ? (
              <div className="text-center" style={{ padding: '20px' }}>
                <div className="spinner" />
              </div>
            ) : results && results.length > 0 ? (
              <AnimatePresence>
                {results.map((result, idx) => (
                  <motion.div
                    key={`${result.type}-${result.id}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onClick={() => handleSelect(result)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      background: selectedIndex === idx ? '#3498db' : 'transparent',
                      color: selectedIndex === idx ? 'white' : 'inherit',
                      borderRadius: '6px',
                      marginBottom: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '500' }}>{result.title}</div>
                      {result.subtitle && (
                        <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                          {result.subtitle}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>
                      {result.type}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="text-center" style={{ padding: '40px', color: '#7f8c8d' }}>
                No results found
              </div>
            )}
          </div>
        )}

        <div style={{ 
          marginTop: '12px', 
          fontSize: '12px', 
          color: '#7f8c8d',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>↑↓ Navigate • Enter Select • Esc Close</span>
          <span>⌘K / Ctrl+K to open</span>
        </div>
      </motion.div>
    </div>
  );
}

