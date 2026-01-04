/**
 * Employee Management Page
 * Full CRUD interface for managing employees
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

interface Employee {
  id: number
  employee_id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  job_title: string
  department: string
  status: string
  employment_type: string
  branch?: number
  branch_name?: string
  hire_date?: string
  is_active: boolean
}

export default function Employees() {
  const [showForm, setShowForm] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const queryClient = useQueryClient()

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', filterStatus, filterBranch],
    queryFn: async () => {
      const params: any = {}
      if (filterStatus) params.status = filterStatus
      if (filterBranch) params.branch = filterBranch
      
      const response = await api.get('/employees/employees/', { params })
      return response.data?.results || response.data || []
    },
  })

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/core/branches/')
      return response.data?.results || response.data || []
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/employees/employees/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employee deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete employee')
    },
  })

  const filteredEmployees = employees.filter((emp: Employee) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      emp.full_name?.toLowerCase().includes(query) ||
      emp.employee_id?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.phone?.toLowerCase().includes(query)
    )
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50', fontWeight: '600' }}>
            👥 Employee Management
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
            Manage employee profiles, HR information, and employment details ({filteredEmployees.length} employees)
          </p>
        </div>
        <Button onClick={() => { setSelectedEmployee(null); setShowForm(true) }}>
          ➕ Add Employee
        </Button>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Search</label>
            <input
              type="text"
              placeholder="Search by name, ID, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Branch</label>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
            >
              <option value="">All Branches</option>
              {branches.map((branch: any) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setSearchQuery('')
              setFilterStatus('')
              setFilterBranch('')
            }}
          >
            Clear
          </Button>
        </div>
      </Card>

      {/* Employees List */}
      {isLoading ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading employees...</div>
        </Card>
      ) : filteredEmployees.length === 0 ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
            <div>No employees found</div>
            <Button onClick={() => { setSelectedEmployee(null); setShowForm(true) }} style={{ marginTop: '16px' }}>
              Add First Employee
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Employee ID</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Contact</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Job Title</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Branch</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee: Employee) => (
                  <tr key={employee.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '600' }}>
                      {employee.employee_id}
                    </td>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{employee.full_name}</td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      <div>{employee.email}</div>
                      <div style={{ color: '#666' }}>{employee.phone}</div>
                    </td>
                    <td style={{ padding: '12px' }}>{employee.job_title || '-'}</td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                      {employee.branch_name || '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: employee.status === 'active' ? '#d4edda' : 
                                   employee.status === 'on_leave' ? '#fff3cd' :
                                   employee.status === 'suspended' ? '#f8d7da' : '#e2e3e5',
                        color: employee.status === 'active' ? '#155724' : 
                               employee.status === 'on_leave' ? '#856404' :
                               employee.status === 'suspended' ? '#721c24' : '#383d41'
                      }}>
                        {employee.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#666' }}>
                      {employee.employment_type.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => { setSelectedEmployee(employee); setShowForm(true) }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm(`Delete employee "${employee.full_name}"?`)) {
                              deleteMutation.mutate(employee.id)
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Employee Form Modal */}
      {showForm && (
        <EmployeeForm
          employee={selectedEmployee}
          branches={branches}
          onClose={() => { setShowForm(false); setSelectedEmployee(null) }}
          onSuccess={() => {
            setShowForm(false)
            setSelectedEmployee(null)
            queryClient.invalidateQueries({ queryKey: ['employees'] })
          }}
        />
      )}
    </div>
  )
}

interface EmployeeFormProps {
  employee: Employee | null
  branches: any[]
  onClose: () => void
  onSuccess: () => void
}

function EmployeeForm({ employee, branches, onClose, onSuccess }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    employee_id: employee?.employee_id || '',
    first_name: employee?.first_name || '',
    last_name: employee?.last_name || '',
    middle_name: (employee as any)?.middle_name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    job_title: employee?.job_title || '',
    department: (employee as any)?.department || '',
    status: employee?.status || 'active',
    employment_type: (employee as any)?.employment_type || 'full_time',
    branch: employee?.branch || null,
    hire_date: (employee as any)?.hire_date || '',
    salary: (employee as any)?.salary || '',
    hourly_rate: (employee as any)?.hourly_rate || '',
    address: (employee as any)?.address || '',
    notes: (employee as any)?.notes || '',
  })

  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (employee) {
        return api.patch(`/employees/employees/${employee.id}/`, data)
      } else {
        return api.post('/employees/employees/', data)
      }
    },
    onSuccess: () => {
      toast.success(employee ? 'Employee updated successfully' : 'Employee created successfully')
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      onSuccess()
    },
    onError: (error: any) => {
      const errorDetail = error.response?.data
      if (errorDetail?.employee_id) {
        toast.error(`Employee ID error: ${errorDetail.employee_id}`)
      } else {
        toast.error(errorDetail?.detail || `Failed to ${employee ? 'update' : 'create'} employee`)
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      branch: formData.branch || null,
      salary: formData.salary ? parseFloat(formData.salary.toString()) : null,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate.toString()) : null,
    }
    saveMutation.mutate(submitData)
  }

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
      onClick={onClose}
    >
      <Card
        style={{
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0 }}>{employee ? 'Edit Employee' : 'Create Employee'}</h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#999',
              }}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Basic Information */}
              <div style={{ borderBottom: '1px solid #eee', paddingBottom: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '18px' }}>Basic Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Employee ID <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value.toUpperCase() })}
                      required
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      First Name <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Last Name <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div style={{ borderBottom: '1px solid #eee', paddingBottom: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '18px' }}>Contact Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Phone <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div style={{ borderBottom: '1px solid #eee', paddingBottom: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '18px' }}>Employment Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Job Title</label>
                    <input
                      type="text"
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Branch</label>
                    <select
                      value={formData.branch || ''}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value ? parseInt(e.target.value) : null })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                    >
                      <option value="">No Branch</option>
                      {branches.map((branch: any) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Employment Type</label>
                    <select
                      value={formData.employment_type}
                      onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="temporary">Temporary</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                    >
                      <option value="active">Active</option>
                      <option value="on_leave">On Leave</option>
                      <option value="suspended">Suspended</option>
                      <option value="terminated">Terminated</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Hire Date</label>
                  <input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                  />
                </div>
              </div>

              {/* Compensation */}
              <div style={{ borderBottom: '1px solid #eee', paddingBottom: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '18px' }}>Compensation</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Salary</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      placeholder="Monthly salary"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Hourly Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                      placeholder="Hourly rate"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={saveMutation.isPending}>
                {employee ? 'Update' : 'Create'} Employee
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}


