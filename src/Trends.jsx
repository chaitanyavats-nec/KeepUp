import { useState, useEffect } from 'react'
import { api } from './api'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, YAxis } from 'recharts'
import TaskSkeleton from './TaskSkeleton'
import { formatDurationText } from './DurationTrackerItem'
import { MONTH_NAMES, getLocalDateString, getLastNDays } from './dateUtils'
import { calculateStreak } from './streak'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function Trends({ onOpenAdd }) {
  const [data, setData] = useState({ categories: [], habits: [], logs: [], options: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTrendData()
  }, [])

  const todayStr = getLocalDateString(new Date())

  const fetchTrendData = async () => {
    setLoading(true)
    setError(null)

    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 60) // Fetch wider range for monthly view

      const endStr = getLocalDateString(endDate)
      const startStr = getLocalDateString(startDate)

      const [cats, habs, logs, options] = await Promise.all([
        api('getCategories'),
        api('getHabits', { archived: false }),
        api('getLogsByDateRange', { startStr, endStr }),
        api('getHabitOptions')
      ])

      setData({
        categories: cats || [],
        habits: habs || [],
        logs: logs || [],
        options: options || []
      })
    } catch (err) {
      setError(err.message || 'Failed to load trends.')
    } finally {
      setLoading(false)
    }
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

  const days30 = getLastNDays(30)
  const last7Days = getLastNDays(7)

  const categoriesWithHabits = data.categories.map(cat => ({
    ...cat,
    habits: data.habits.filter(h => h.category_id === cat.id)
  })).filter(cat => cat.habits.length > 0)

  const uncategorizedHabits = data.habits.filter(h => !h.category_id)
  const allGroups = [...categoriesWithHabits]
  if (uncategorizedHabits.length > 0) {
    allGroups.push({ id: 'uncategorized', name: 'Uncategorized', color: 'var(--text-dark)', habits: uncategorizedHabits })
  }

  if (loading) return <TaskSkeleton />

  if (error) {
    return (
      <div className="fade-in error-state">
        <div className="error-state-title">Couldn't load your trends</div>
        <p>{error}</p>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={fetchTrendData}>Retry</button>
      </div>
    )
  }

  if (allGroups.length === 0) {
    return (
      <div className="fade-in empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">Nothing to show yet</div>
        <div className="empty-state-sub">Add a habit and start logging to see trends here.</div>
        {onOpenAdd && <button className="btn btn-primary" onClick={onOpenAdd}>Add a Habit</button>}
      </div>
    )
  }

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
                const streak = calculateStreak(data.logs, habit.id, todayStr)
                const hasWeekGoal = habit.goal_period === 'week' && Number(habit.goal_target) > 0
                const weekCount = last7Days.filter(day => habitLogs.some(l => l.log_date === day)).length
                const weekGoalPct = hasWeekGoal ? Math.min(1, weekCount / Number(habit.goal_target)) : 0

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
                              backgroundColor: log ? cat.color : (isFuture ? 'transparent' : 'var(--track-bg)'),
                              opacity: isFuture ? 0.2 : 1,
                              color: log ? '#fff' : 'var(--muted-text-soft)'
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

                    {hasWeekGoal && (
                      <div className="goal-progress">
                        <div className="goal-progress-label">
                          <span>This week</span>
                          <span>{weekCount}/{habit.goal_target}</span>
                        </div>
                        <div className="goal-progress-track">
                          <div className="goal-progress-fill" style={{ width: `${weekGoalPct * 100}%`, backgroundColor: cat.color }} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              } else if (habit.type === 'choice') {
                const habitOptions = data.options.filter(o => o.habit_id === habit.id)
                const monthLogs = habitLogs.filter(l => monthDays.includes(l.log_date))
                const counts = {}
                monthLogs.forEach(l => {
                  if (!l.note) return
                  try {
                    const ids = JSON.parse(l.note)
                    const id = ids[0]
                    if (id) counts[id] = (counts[id] || 0) + 1
                  } catch {
                    // ignore malformed note
                  }
                })
                const maxCount = Math.max(1, ...habitOptions.map(o => counts[o.id] || 0))
                const daysSoFar = monthDays.filter(d => d <= todayStr).length

                return (
                  <div key={habit.id} className="card" style={{ marginBottom: 0 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{habit.name}</h3>
                    <p className="choice-breakdown-sub">{monthLogs.length}/{daysSoFar} days logged this month</p>
                    <div className="choice-breakdown">
                      {habitOptions.map(opt => {
                        const count = counts[opt.id] || 0
                        return (
                          <div key={opt.id} className="choice-breakdown-row">
                            <span className="choice-breakdown-label">{opt.label}</span>
                            <div className="goal-progress-track">
                              <div className="goal-progress-fill" style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: 'var(--accent-slate)' }} />
                            </div>
                            <span className="choice-breakdown-count">{count}</span>
                          </div>
                        )
                      })}
                      {habitOptions.length === 0 && (
                        <p className="habit-row-meta">No options defined yet — add some in Manage.</p>
                      )}
                    </div>
                  </div>
                )
              } else {
                // Numeric, Duration, Checklist, or Scale
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
                const isChecklist = habit.type === 'checklist'

                const barColor = isDuration ? 'var(--accent-amber)' : (isChecklist ? 'var(--accent-protein)' : cat.color)
                const unitLabel = habit.unit || (isChecklist ? 'pts' : '')

                const hasDayGoal = habit.goal_period === 'day' && Number(habit.goal_target) > 0
                const todayLog = habitLogs.find(l => l.log_date === todayStr)
                const todayVal = todayLog ? Number(todayLog.value) : 0
                const dayGoalPct = hasDayGoal ? Math.min(1, todayVal / Number(habit.goal_target)) : 0

                return (
                  <div key={habit.id} className="card" style={{ marginBottom: 0 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                      {habit.name}
                      {isChecklist && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-protein)', marginLeft: '0.5rem', fontWeight: 500 }}>CHECKLIST</span>
                      )}
                      {isDuration && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', marginLeft: '0.5rem', fontWeight: 500 }}>DURATION</span>
                      )}
                    </h3>
                    <div style={{ height: '160px', width: '100%', marginLeft: '-1rem' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-dark)' }} axisLine={false} tickLine={false} />
                          <YAxis hide domain={[0, 'auto']} />
                          <Tooltip
                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                            contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            formatter={(value) => [
                              isDuration ? formatDurationText(value) : `${value}${unitLabel ? ` ${unitLabel}` : ''}`,
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
                            ? (isDuration ? formatDurationText(Math.round(avg)) : `${avg}${unitLabel ? ` ${unitLabel}` : ''}`)
                            : '-'
                          }
                        </span>
                      </div>
                      <div className="stat-box">
                        <span className="mono-text">Latest</span>
                        <span className="stat-value">
                          {latestVal !== '-'
                            ? (isDuration ? formatDurationText(latestVal) : `${latestVal}${unitLabel ? ` ${unitLabel}` : ''}`)
                            : '-'
                          }
                        </span>
                      </div>
                      {(isChecklist || isDuration) && (
                        <div className="stat-box">
                          <span className="mono-text">Total (period)</span>
                          <span className="stat-value">
                            {isDuration ? formatDurationText(sum) : `${sum}${unitLabel ? ` ${unitLabel}` : ''}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {hasDayGoal && (
                      <div className="goal-progress">
                        <div className="goal-progress-label">
                          <span>Today</span>
                          <span>
                            {isDuration ? formatDurationText(todayVal) : `${todayVal}${unitLabel ? ` ${unitLabel}` : ''}`}
                            {' / '}
                            {isDuration ? formatDurationText(Number(habit.goal_target)) : `${habit.goal_target}${unitLabel ? ` ${unitLabel}` : ''}`}
                          </span>
                        </div>
                        <div className="goal-progress-track">
                          <div className="goal-progress-fill" style={{ width: `${dayGoalPct * 100}%`, backgroundColor: barColor }} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
