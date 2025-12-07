/**
 * Branch Selector Component
 * Reusable component for selecting branches across the application
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

interface Branch {
  id: number
  name: string
  code: string
  is_main: boolean
  is_active: boolean
}

interface BranchSelectorProps {
  selectedBranch?: number | null | 'all'
  onBranchChange: (branchId: number | 'all') => void
  showAll?: boolean
  label?: string
  placeholder?: string
  style?: React.CSSProperties
  className?: string
  compact?: boolean
}

export default function BranchSelector({
  selectedBranch = 'all',
  onBranchChange,
  showAll = true,
  label = 'Branch',
  placeholder = 'Select branch...',
  style,
  className = '',
  compact = false,
}: BranchSelectorProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const { data: branchesResponse, isLoading } = useQuery({
    queryKey: ['branches-for-selector'],
    queryFn: async () => {
      const response = await api.get('/core/branches/', { params: { is_active: true } })
      return response.data
    },
  })

  const branches = branchesResponse?.results || branchesResponse || []
  
  // Filter to user's branch if they have one, or show all if admin
  const canSeeAllBranches = user?.role === 'tenant_admin' || user?.role === 'super_admin' || user?.role === 'manager'
  const filteredBranches = canSeeAllBranches 
    ? branches 
    : branches.filter((b: Branch) => !user?.branch || b.id === user.branch)

  const selectedBranchObj = selectedBranch && selectedBranch !== 'all'
    ? branches.find((b: Branch) => b.id === selectedBranch)
    : null

  if (compact) {
    return (
      <div style={{ position: 'relative', ...style }} className={className}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="input"
          style={{
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            ...style
          }}
        >
          <span>
            {selectedBranch === 'all' || !selectedBranch
              ? showAll ? 'All Branches' : placeholder
              : selectedBranchObj?.name || placeholder}
          </span>
          <span style={{ marginLeft: '8px' }}>{isOpen ? '▲' : '▼'}</span>
        </button>
        
        {isOpen && (
          <>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999,
              }}
              onClick={() => setIsOpen(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 1000,
                background: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                marginTop: '4px',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {showAll && (
                <div
                  onClick={() => {
                    onBranchChange('all')
                    setIsOpen(false)
                  }}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    background: selectedBranch === 'all' ? '#f0f0f0' : 'transparent',
                    borderBottom: '1px solid #e0e0e0',
                  }}
                >
                  <div style={{ fontWeight: selectedBranch === 'all' ? '600' : '400' }}>
                    All Branches
                  </div>
                </div>
              )}
              {filteredBranches.map((branch: Branch) => (
                <div
                  key={branch.id}
                  onClick={() => {
                    onBranchChange(branch.id)
                    setIsOpen(false)
                  }}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    background: selectedBranch === branch.id ? '#f0f0f0' : 'transparent',
                    borderBottom: branch === filteredBranches[filteredBranches.length - 1] ? 'none' : '1px solid #e0e0e0',
                  }}
                >
                  <div style={{ fontWeight: selectedBranch === branch.id ? '600' : '400' }}>
                    {branch.name}
                    {branch.is_main && (
                      <span style={{ marginLeft: '8px', fontSize: '12px', color: '#3498db' }}>
                        🏠 Main
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                    {branch.code}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={style} className={className}>
      {label && (
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
          {label}
        </label>
      )}
      <select
        value={selectedBranch === 'all' ? 'all' : selectedBranch || ''}
        onChange={(e) => {
          const value = e.target.value
          onBranchChange(value === 'all' ? 'all' : parseInt(value))
        }}
        className="input"
        style={{ width: '100%' }}
      >
        {showAll && <option value="all">All Branches</option>}
        {filteredBranches.map((branch: Branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name} {branch.is_main ? '🏠 (Main)' : ''} - {branch.code}
          </option>
        ))}
      </select>
    </div>
  )
}

