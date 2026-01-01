/**
 * Shift Scheduling Page
 * Manage employee shifts, templates, and time clock
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

interface Shift {
  id: number
  employee: number
  employee_name: string
  employee_id: string
  branch_name: string
  date: string
  start_time: string
  end_time: string
  status: string
  status_display: string
  clock_in_time?: string
  clock_out_time?: string
  scheduled_hours: number
  actual_hours?: number
  is_late?: boolean
}

export default function Shifts() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'templates' | 'time-clock'>('schedule')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const queryClient = useQueryClient()

  // Fetch shifts
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts', selectedDate],
    queryFn: async () => {
      const today = new Date(selectedDate)
      const startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 7) // Show week view
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + 7)
      
      const response = await api.get('/employees/shifts/', {
        params: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        }
      })
      return response.data?.results || response.data || []
    },
  })

  // Fetch current user's active shift
  const { data: currentShift } = useQuery({
    queryKey: ['current-shift'],
    queryFn: async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const response = await api.get('/employees/shifts/', {
          params: {
            date: today,
            status: 'in_progress',
          }
        })
        const shifts = response.data?.results || response.data || []
        return shifts.find((s: Shift) => s.status === 'in_progress') || null
      } catch {
        return null
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async ({ shiftId, location }: { shiftId: number; location?: any }) => {
      return api.post(`/employees/shifts/${shiftId}/clock_in/`, { location })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      queryClient.invalidateQueries({ queryKey: ['current-shift'] })
      toast.success('Clocked in successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to clock in')
    },
  })

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async ({ shiftId, location }: { shiftId: number; location?: any }) => {
      return api.post(`/employees/shifts/${shiftId}/clock_out/`, { location })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      queryClient.invalidateQueries({ queryKey: ['current-shift'] })
      toast.success('Clocked out successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to clock out')
    },
  })

  // Group shifts by date
  const shiftsByDate: { [key: string]: Shift[] } = {}
  shifts.forEach((shift: Shift) => {
    if (!shiftsByDate[shift.date]) {
      shiftsByDate[shift.date] = []
    }
    shiftsByDate[shift.date].push(shift)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50', fontWeight: '600' }}>
            ⏰ Shift Scheduling
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
            Manage employee shifts, templates, and time clock
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '2px solid #ecf0f1' }}>
        <button
          onClick={() => setActiveTab('schedule')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'schedule' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'schedule' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'schedule' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          📅 Schedule
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'templates' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'templates' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'templates' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          📋 Templates
        </button>
        <button
          onClick={() => setActiveTab('time-clock')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'time-clock' ? '3px solid #3498db' : '3px solid transparent',
            color: activeTab === 'time-clock' ? '#3498db' : '#7f8c8d',
            fontWeight: activeTab === 'time-clock' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ⏰ Time Clock
        </button>
      </div>

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div>
          {/* Date Selector */}
          <Card style={{ marginBottom: '20px', padding: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <label style={{ fontWeight: '600' }}>View Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
              />
              <Button
                variant="secondary"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                Today
              </Button>
            </div>
          </Card>

          {/* Shifts Calendar */}
          {isLoading ? (
            <Card>
              <div style={{ padding: '40px', textAlign: 'center' }}>Loading shifts...</div>
            </Card>
          ) : Object.keys(shiftsByDate).length === 0 ? (
            <Card>
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                <div>No shifts scheduled</div>
              </div>
            </Card>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {Object.entries(shiftsByDate)
                .sort()
                .map(([date, dateShifts]) => (
                  <Card key={date}>
                    <div style={{ padding: '16px' }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>
                        {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </h3>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {dateShifts.map((shift: Shift) => (
                          <div
                            key={shift.id}
                            style={{
                              padding: '12px',
                              border: '1px solid #eee',
                              borderRadius: '6px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: shift.status === 'in_progress' ? '#e3f2fd' : 'white',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                {shift.employee_name} ({shift.employee_id})
                              </div>
                              <div style={{ fontSize: '14px', color: '#666' }}>
                                {shift.start_time} - {shift.end_time} ({shift.scheduled_hours.toFixed(1)}h)
                              </div>
                              {shift.clock_in_time && (
                                <div style={{ fontSize: '12px', color: '#2ecc71', marginTop: '4px' }}>
                                  Clocked in: {new Date(shift.clock_in_time).toLocaleTimeString()}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                background: shift.status === 'completed' ? '#d4edda' :
                                          shift.status === 'in_progress' ? '#cfe2ff' :
                                          shift.status === 'no_show' ? '#f8d7da' : '#fff3cd',
                                color: shift.status === 'completed' ? '#155724' :
                                       shift.status === 'in_progress' ? '#084298' :
                                       shift.status === 'no_show' ? '#721c24' : '#856404'
                              }}>
                                {shift.status_display}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Time Clock Tab */}
      {activeTab === 'time-clock' && (
        <div>
          <Card style={{ padding: '32px', textAlign: 'center' }}>
            {currentShift ? (
              <div>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏰</div>
                <h2 style={{ margin: '0 0 16px' }}>Shift In Progress</h2>
                <div style={{ marginBottom: '24px', color: '#666' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                    {currentShift.employee_name}
                  </div>
                  <div>{currentShift.start_time} - {currentShift.end_time}</div>
                  {currentShift.clock_in_time && (
                    <div style={{ marginTop: '8px', fontSize: '14px', color: '#2ecc71' }}>
                      Clocked in: {new Date(currentShift.clock_in_time).toLocaleTimeString()}
                    </div>
                  )}
                </div>
                <Button
                  size="lg"
                  variant="danger"
                  onClick={() => {
                    if (confirm('Clock out from this shift?')) {
                      clockOutMutation.mutate({ shiftId: currentShift.id })
                    }
                  }}
                  isLoading={clockOutMutation.isPending}
                >
                  Clock Out
                </Button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏰</div>
                <h2 style={{ margin: '0 0 16px' }}>No Active Shift</h2>
                <p style={{ color: '#666', marginBottom: '24px' }}>
                  You don't have an active shift right now. Check the schedule tab to see your upcoming shifts.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Templates Tab - Placeholder */}
      {activeTab === 'templates' && (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <div>Shift Templates Management</div>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Coming soon...</p>
          </div>
        </Card>
      )}
    </div>
  )
}

