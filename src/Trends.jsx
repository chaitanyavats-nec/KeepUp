import { useState, useEffect } from 'react'
import { api } from './api'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, YAxis } from 'recharts'
import TaskSkeleton from './TaskSkeleton'
import { formatDurationText } from './DurationTrackerItem'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function Trends() {
  const [data, setData] = useState({ categories: [], habits: [], logs: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrendData()
  }, [])

  const getLocalDateString = (d) => {
    const offset = d.getTimezoneOffset()
    const localDate = new Date(d.getTime() - (offset * 60 * 1000))
    return localDate.toISOString().split('T')[0]
  }

  const todayStr = getLocalDateString(new Date())

  const fetchTrendData = async () => {
    setLoading(true)
    
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 60) // Fetch wider range for monthly view

    const endStr = getLocalDateString(endDate)
    const startStr = getLocalDateString(startDate)

    const [cats, habs, logs] = await Promise.all([
      api('getCategories'),
      api('getHabits', { archived: false }),
      api('getLogsByDateRange', { startStr, endStr })
    ])

    setData({
      categories: cats || [],
      habits: habs || [],
      logs: logs || []
    })
    
    setLoading(false)
  }

  // Generate days for the current month as a calendar grid
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay() // 0=Sun

  const monthDays = []
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(currentYear, currentMonth, i)
    monthDays.push(getLocalDateString(d))
  }

  // Generate last 30 days for charts
  const getLast30Days = () => {
    const days = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      days.push(getLocalDateString(d))
    }
    return days
  }
  const days30 = getLast30Days()

  const calculateStreak = (habitId) => {
    let streak = 0
    let d = new Date()
    
    const logToday = data.logs.find(l => l.habit_id === habitId && l.log_date === todayStr)
    if (!logToday) {
      d.setDate(d.getDate() - 1)
    }

    while (true) {
      const dateStr = getLocalDateString(d)
      const log = data.logs.find(l => l.habit_id === habitId && l.log_date === dateStr)
      if (log) {
        streak++
        d.setDate(d.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  }

  const categoriesWithHabits = data.categories.map(cat => ({
    ...cat,
    habits: data.habits.filter(h => h.category_id === cat.id)
  })).filter(cat => cat.habits.length > 0)

  const uncategorizedHabits = data.habits.filter(h => !h.category_id)
  const allGroups = [...categoriesWithHabits]
  if (uncategorizedHabits.length > 0) {
    allGroups.push({ id: 'uncategorized', name: 'Uncategorized', color: 'var(--text-color)', habits: uncategorizedHabits })
  }

  if (loading) return <TaskSkeleton />

  return (
    <div className="trends-grid fade-in">
      {/* Month + Date Header */}
      <div className="trends-header">
        <div className="trends-month-label">{MONTH_NAMES[currentMonth]} {currentYear}</div>
        <div className="trends-date-sub">Your activity log</div>
      </div>

      {allGroups.map(cat => (
        <div key={cat.id}>
          <div className="category-title" style={{ marginBottom: '1rem' }}>
            <div className="category-dot" style={{ backgroundColor: cat.color, width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block', marginRight: '0.5rem' }} />
            <h2 style={{ fontSize: '1.25rem', display: 'inline' }}>{cat.name}</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cat.habits.map(habit => {
              const habitLogs = data.logs.filter(l => l.habit_id === habit.id)
              
              if (habit.type === 'boolean') {
                const total = habitLogs.filter(l => monthDays.includes(l.log_date)).length
                const streak = calculateStreak(habit.id)
                
                return (
                  <div key={habit.id} className="card" style={{ marginBottom: 0 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>{habit.name}</h3>
                    
                    {/* Consistency Grid - Calendar style */}
                    <div className="consistency-grid">
                      {DAY_LABELS.map((label, i) => (
                        <div key={i} className="consistency-day-label">{label}</div>
                      ))}
                      {/* Empty slots for offset */}
                      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="consistency-cell empty-slot" />
                      ))}
                      {/* Day cells */}
                      {monthDays.map((day, i) => {
                        const dayNum = i + 1
                        const log = habitLogs.find(l => l.log_date === day)
                        const isTodayCell = day === todayStr
                        const isFuture = day > todayStr
                        
                        return (
                          <div 
                            key={day}
                            className={`consistency-cell ${log ? 'filled' : ''} ${isTodayCell ? 'today-cell' : ''}`}
                            style={{ 
                              backgroundColor: log ? cat.color : (isFuture ? 'transparent' : 'rgba(0,0,0,0.04)'),
                              opacity: isFuture ? 0.2 : 1,
                              color: log ? '#fff' : '#bbb'
                            }}
                            title={`${day}: ${log ? 'Done' : 'Missed'}`}
                          >
                            {dayNum}
                          </div>
                        )
                      })}
                    </div>
                    
                    <div className="trend-stats">
                      <div className="stat-box">
                        <span className="mono-text">This Month</span>
                        <span className="stat-value">{total}/{monthDays.filter(d => d <= todayStr).length}</span>
                      </div>
                      <div className="stat-box">
                        <span className="mono-text">Streak</span>
                        <span className="stat-value">{streak} 🔥</span>
                      </div>
                    </div>
                  </div>
                )
              } else {
                // Numeric, Protein, or Duration
                const chartData = days30.map(day => {
                  const log = habitLogs.find(l => l.log_date === day)
                  return {
                    date: day.split('-').slice(1).join('/'),
                    value: log ? Number(log.value) : null
                  }
                })
                
                const values = habitLogs.map(l => Number(l.value))
                const sum = values.reduce((a, b) => a + b, 0)
                const avg = values.length > 0 ? (sum / values.length).toFixed(1) : '-'
                const latestLog = [...habitLogs].sort((a,b) => b.log_date.localeCompare(a.log_date))[0]
                const latestVal = latestLog ? latestLog.value : '-'
                
                const isDuration = habit.type === 'duration'
                const isProtein = habit.type === 'protein'

                const barColor = isDuration ? 'var(--accent-amber)' : (isProtein ? 'var(--accent-protein)' : cat.color)
                const unitLabel = isProtein ? 'g protein' : (habit.unit || 'mins')

                return (
                  <div key={habit.id} className="card" style={{ marginBottom: 0 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                      {habit.name}
                      {isProtein && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-protein)', marginLeft: '0.5rem', fontWeight: 500 }}>PROTEIN</span>
                      )}
                      {isDuration && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', marginLeft: '0.5rem', fontWeight: 500 }}>DURATION</span>
                      )}
                    </h3>
                    <div style={{ height: '160px', width: '100%', marginLeft: '-1rem' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-color)' }} axisLine={false} tickLine={false} />
                          <YAxis hide domain={[0, 'auto']} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                            contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            formatter={(value) => [
                              isDuration ? formatDurationText(value) : `${value} ${unitLabel}`, 
                              habit.name
                            ]}
                          />
                          <Bar dataKey="value" fill={barColor} radius={[4,4,0,0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="trend-stats">
                      <div className="stat-box">
                        <span className="mono-text">Average</span>
                        <span className="stat-value">
                          {avg !== '-' 
                            ? (isDuration ? formatDurationText(Math.round(avg)) : `${avg} ${unitLabel}`) 
                            : '-'
                          }
                        </span>
                      </div>
                      <div className="stat-box">
                        <span className="mono-text">Latest</span>
                        <span className="stat-value">
                          {latestVal !== '-' 
                            ? (isDuration ? formatDurationText(latestVal) : `${latestVal} ${unitLabel}`) 
                            : '-'
                          }
                        </span>
                      </div>
                      {(isProtein || isDuration) && (
                        <div className="stat-box">
                          <span className="mono-text">Total (30d)</span>
                          <span className="stat-value">
                            {isDuration ? formatDurationText(sum) : `${sum}g`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
            })}
          </div>
        </div>
      ))}
      {allGroups.length === 0 && <p>No habits to show.</p>}
    </div>
  )
}
