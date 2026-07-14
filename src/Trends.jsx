import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, YAxis } from 'recharts'

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

  const fetchTrendData = async () => {
    setLoading(true)
    
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 29) // last 30 days (including today)
    
    const endStr = getLocalDateString(endDate)
    const startStr = getLocalDateString(startDate)

    const [catRes, habRes, logRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('habits').select('*').eq('archived', false).order('sort_order'),
      supabase.from('logs').select('*').gte('log_date', startStr).lte('log_date', endStr)
    ])

    setData({
      categories: catRes.data || [],
      habits: habRes.data || [],
      logs: logRes.data || []
    })
    
    setLoading(false)
  }

  // Generate array of last 30 days in 'YYYY-MM-DD' format
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
    let today = getLocalDateString(new Date())
    let d = new Date()
    
    // Check if logged today or yesterday to start streak count
    const logToday = data.logs.find(l => l.habit_id === habitId && l.log_date === today)
    if (!logToday) {
      d.setDate(d.getDate() - 1) // Start check from yesterday
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

  if (loading) return <div>Loading...</div>

  return (
    <div className="trends-grid">
      {allGroups.map(cat => (
        <div key={cat.id}>
          <div className="category-title" style={{ marginBottom: '1rem' }}>
            <div className="category-dot" style={{ backgroundColor: cat.color }} />
            <h2 style={{ fontSize: '1.25rem' }}>{cat.name}</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cat.habits.map(habit => {
              const habitLogs = data.logs.filter(l => l.habit_id === habit.id)
              
              if (habit.type === 'boolean') {
                const total = habitLogs.length
                const streak = calculateStreak(habit.id)
                return (
                  <div key={habit.id} className="card" style={{ marginBottom: 0 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{habit.name}</h3>
                    <div className="strand-month">
                      {days30.map(day => {
                        const log = habitLogs.find(l => l.log_date === day)
                        return (
                          <div 
                            key={day}
                            className="mini-bead"
                            style={{ 
                              borderColor: cat.color,
                              backgroundColor: log ? cat.color : 'transparent',
                              opacity: log ? 1 : 0.4
                            }}
                            title={`${day}: ${log ? 'Done' : 'Missed'}`}
                          />
                        )
                      })}
                    </div>
                    <div className="trend-stats">
                      <div className="stat-box">
                        <span className="mono-text">30-Day</span>
                        <span className="stat-value">{total}</span>
                      </div>
                      <div className="stat-box">
                        <span className="mono-text">Streak</span>
                        <span className="stat-value">{streak}</span>
                      </div>
                    </div>
                  </div>
                )
              } else {
                // Numeric
                const chartData = days30.map(day => {
                  const log = habitLogs.find(l => l.log_date === day)
                  return {
                    date: day.split('-').slice(1).join('/'), // MM/DD
                    value: log ? Number(log.value) : null
                  }
                })
                
                const values = habitLogs.map(l => Number(l.value))
                const sum = values.reduce((a, b) => a + b, 0)
                const avg = values.length > 0 ? (sum / values.length).toFixed(1) : '-'
                const latestLog = habitLogs.sort((a,b) => b.log_date.localeCompare(a.log_date))[0]
                const latestVal = latestLog ? latestLog.value : '-'
                
                return (
                  <div key={habit.id} className="card" style={{ marginBottom: 0 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>{habit.name}</h3>
                    <div style={{ height: '160px', width: '100%', marginLeft: '-1rem' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-color)' }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                            contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                          />
                          <Bar dataKey="value" fill={cat.color} radius={[4,4,0,0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="trend-stats">
                      <div className="stat-box">
                        <span className="mono-text">Average</span>
                        <span className="stat-value">{avg} {avg !== '-' && habit.unit}</span>
                      </div>
                      <div className="stat-box">
                        <span className="mono-text">Latest</span>
                        <span className="stat-value">{latestVal} {latestVal !== '-' && habit.unit}</span>
                      </div>
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
