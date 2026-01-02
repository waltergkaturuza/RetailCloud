/**
 * Journal Entries Management Page
 * Premium Feature - Double-Entry Bookkeeping
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import JournalEntryForm from '../components/accounting/JournalEntryForm'

interface JournalEntry {
  id: number
  entry_number: string
  date: string
  description: string
  reference?: string
  entry_type: string
  entry_type_display?: string
  is_posted: boolean
  posted_at?: string
  created_by_name?: string
  branch_name?: string
  journal_lines?: JournalLine[]
  total_debit?: number
  total_credit?: number
  is_balanced?: boolean
}

interface JournalLine {
  id?: number
  account: number
  account_code?: string
  account_name?: string
  debit_amount: number
  credit_amount: number
  description?: string
  reference?: string
}

export default function JournalEntries() {
  const [searchQuery, setSearchQuery] = useState('')
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'posted' | 'unposted'>('all')
  const [showForm, setShowForm] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const queryClient = useQueryClient()

  // Fetch journal entries
  const { data: entriesResponse, isLoading, error } = useQuery({
    queryKey: ['journal-entries', searchQuery, entryTypeFilter, statusFilter, dateRange],
    queryFn: async () => {
      try {
        const params: any = {
          ordering: '-date,-created_at'
        }
        if (searchQuery) params.search = searchQuery
        if (entryTypeFilter !== 'all') params.entry_type = entryTypeFilter
        if (statusFilter === 'posted') params.is_posted = 'true'
        if (statusFilter === 'unposted') params.is_posted = 'false'
        if (dateRange.start) params.date__gte = dateRange.start
        if (dateRange.end) params.date__lte = dateRange.end
        
        const response = await api.get('/accounting/journal-entries/', { params })
        return response.data
      } catch (err: any) {
        if (err.response?.status === 403) {
          throw new Error('Accounting module is not activated. Please activate it to use double-entry bookkeeping features.')
        }
        throw err
      }
    },
  })

  const entries = (entriesResponse?.results || entriesResponse || []) as JournalEntry[]

  // Post entry mutation
  const postEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/accounting/journal-entries/${id}/post_entry/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      toast.success('Journal entry posted successfully!')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to post entry')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/accounting/journal-entries/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      toast.success('Journal entry deleted successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to delete entry')
    },
  })

  const handleCreate = () => {
    setSelectedEntry(null)
    setShowForm(true)
  }

  const handleEdit = (entry: JournalEntry) => {
    if (entry.is_posted) {
      toast.error('Posted entries cannot be edited')
      return
    }
    setSelectedEntry(entry)
    setShowForm(true)
  }

  const handlePost = (entry: JournalEntry) => {
    if (!entry.is_balanced) {
      toast.error('Unbalanced entries cannot be posted')
      return
    }
    if (entry.is_posted) {
      toast.error('Entry is already posted')
      return
    }
    if (confirm(`Post journal entry ${entry.entry_number}? This will update the General Ledger.`)) {
      postEntryMutation.mutate(entry.id)
    }
  }

  const handleDelete = (entry: JournalEntry) => {
    if (entry.is_posted) {
      toast.error('Posted entries cannot be deleted')
      return
    }
    if (confirm(`Delete journal entry ${entry.entry_number}?`)) {
      deleteMutation.mutate(entry.id)
    }
  }

  const entryTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'general', label: 'General Journal' },
    { value: 'sales', label: 'Sales' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'cash_receipt', label: 'Cash Receipt' },
    { value: 'cash_payment', label: 'Cash Payment' },
    { value: 'adjustment', label: 'Adjustment' },
    { value: 'reversal', label: 'Reversal' },
  ]

  const stats = useMemo(() => {
    return {
      total: entries.length,
      posted: entries.filter(e => e.is_posted).length,
      unposted: entries.filter(e => !e.is_posted).length,
      totalDebit: entries.reduce((sum, e) => sum + (e.total_debit || 0), 0),
      totalCredit: entries.reduce((sum, e) => sum + (e.total_credit || 0), 0),
    }
  }, [entries])

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '18px', color: '#e74c3c', marginBottom: '16px' }}>
              {(error as Error).message || 'Failed to load journal entries'}
            </div>
            <p style={{ color: '#6c757d' }}>
              This feature requires the Accounting module to be activated.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '18px', color: '#6c757d' }}>Loading journal entries...</div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: '#2c3e50' }}>
            📝 Journal Entries
          </h1>
          <p style={{ margin: '8px 0 0', color: '#6c757d', fontSize: '14px' }}>
            Create and manage journal entries for double-entry bookkeeping
          </p>
        </div>
        <Button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>➕</span>
          Create Entry
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Total Entries</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>{stats.total}</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Posted</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#27ae60' }}>{stats.posted}</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Unposted</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#e67e22' }}>{stats.unposted}</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Total Debit</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#2c3e50', fontFamily: 'monospace' }}>
              ${stats.totalDebit.toFixed(2)}
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Total Credit</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#2c3e50', fontFamily: 'monospace' }}>
              ${stats.totalCredit.toFixed(2)}
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
          <div>
            <select
              value={entryTypeFilter}
              onChange={(e) => setEntryTypeFilter(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '180px',
              }}
            >
              {entryTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              style={{
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
          <div>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              style={{
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '10px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: statusFilter === 'all' ? '#3498db' : 'white',
                color: statusFilter === 'all' ? 'white' : '#2c3e50',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: statusFilter === 'all' ? '600' : '400',
              }}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('posted')}
              style={{
                padding: '10px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: statusFilter === 'posted' ? '#27ae60' : 'white',
                color: statusFilter === 'posted' ? 'white' : '#2c3e50',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: statusFilter === 'posted' ? '600' : '400',
              }}
            >
              Posted
            </button>
            <button
              onClick={() => setStatusFilter('unposted')}
              style={{
                padding: '10px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: statusFilter === 'unposted' ? '#e67e22' : 'white',
                color: statusFilter === 'unposted' ? 'white' : '#2c3e50',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: statusFilter === 'unposted' ? '600' : '400',
              }}
            >
              Unposted
            </button>
          </div>
        </div>
      </Card>

      {/* Entries Table */}
      {entries.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '18px', color: '#6c757d', marginBottom: '8px' }}>
              {searchQuery ? 'No entries found' : 'No journal entries yet'}
            </div>
            {!searchQuery && (
              <Button onClick={handleCreate} style={{ marginTop: '16px' }}>
                Create Your First Entry
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Entry #</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Description</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2c3e50' }}>Debit</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2c3e50' }}>Credit</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '600', color: '#3498db' }}>
                      {entry.entry_number}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '500', color: '#2c3e50' }}>{entry.description}</div>
                      {entry.reference && (
                        <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                          Ref: {entry.reference}
                        </div>
                      )}
                      {entry.branch_name && (
                        <div style={{ fontSize: '11px', color: '#95a5a6', marginTop: '2px' }}>
                          {entry.branch_name}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: '#e3f2fd',
                        color: '#1976d2',
                      }}>
                        {entry.entry_type_display || entry.entry_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '500' }}>
                      ${(entry.total_debit || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '500' }}>
                      ${(entry.total_credit || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: entry.is_posted ? '#e8f5e9' : '#fff3e0',
                        color: entry.is_posted ? '#27ae60' : '#e67e22',
                      }}>
                        {entry.is_posted ? 'Posted' : 'Unposted'}
                      </span>
                      {!entry.is_balanced && (
                        <div style={{ fontSize: '10px', color: '#e74c3c', marginTop: '4px' }}>Unbalanced</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {!entry.is_posted && (
                          <>
                            <Button
                              onClick={() => handleEdit(entry)}
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => handlePost(entry)}
                              style={{ padding: '6px 12px', fontSize: '12px', background: '#27ae60', color: 'white' }}
                            >
                              Post
                            </Button>
                            <Button
                              onClick={() => handleDelete(entry)}
                              style={{ padding: '6px 12px', fontSize: '12px', background: '#e74c3c', color: 'white' }}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                        {entry.is_posted && (
                          <span style={{ fontSize: '12px', color: '#6c757d' }}>Locked</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Form Modal */}
      {showForm && (
        <JournalEntryForm
          entry={selectedEntry}
          onClose={() => {
            setShowForm(false)
            setSelectedEntry(null)
          }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
            setShowForm(false)
            setSelectedEntry(null)
            toast.success(selectedEntry?.id ? 'Entry updated successfully!' : 'Entry created successfully!')
          }}
        />
      )}
    </div>
  )
}

