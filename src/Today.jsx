import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function Today() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [data, setData] = useState({ categories: [], habits: [], logs: [] })
  const [loading, setLoading] = useState(true)

  // Local state for optimistic updates on numeric values
  const [numericInputs, setNumericInputs] = useState({})

  const getLocalDateString = (d) => {
    const offset = d.getTimezoneOffset()
    const localDate = new Date(d.getTime() - (offset * 60 * 1000))
    return localDate.toISOString().split('T')[0]
  }

  const dateString = getLocalDateString(selectedDate)
  const todayString = getLocalDateString(new Date())
  const isToday = dateString === todayString

  useEffect(() => {
    fetchTodayData()
  }, [dateString])

  const fetchTodayData = async () => {
    setLoading(true)
    
    // Fetch categories, unarchived habits, and logs for the selected date
    const [catRes, habRes, logRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('habits').select('*').eq('archived', false).order('sort_order'),
      supabase.from('logs').select('*').eq('log_date', dateString)
    ])

    const cats = catRes.data || []
    const habs = habRes.data || []
    const logs = logRes.data || []

    setData({ categories: cats, habits: habs, logs })

    // Initialize numeric inputs state
    const inputs = {}
    habs.filter(h => h.type === 'numeric').forEach(h => {
      const log = logs.find(l => l.habit_id === h.id)
      inputs[h.id] = log ? log.value.toString() : ''
    })
    setNumericInputs(inputs)

    setLoading(false)
  }

  const navigateDate = (days) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    // Prevent navigating into the future
    if (newDate > new Date()) return
    setSelectedDate(newDate)
  }

  const handleToggleBoolean = async (habitId, currentLog) => {
    // Optimistic update
    const isLogged = !!currentLog
    let newLogs = [...data.logs]

    if (isLogged) {
      newLogs = newLogs.filter(l => l.id !== currentLog.id)
      setData(prev => ({ ...prev, logs: newLogs }))
      await supabase.from('logs').delete().eq('id', currentLog.id)
    } else {
      const tempLog = { id: 'temp', habit_id: habitId, log_date: dateString, value: 1 }
      newLogs.push(tempLog)
      setData(prev => ({ ...prev, logs: newLogs }))
      
      const { data: inserted } = await supabase.from('logs').insert([{
        habit_id: habitId,
        log_date: dateString,
        value: 1
      }]).select().single()
      
      if (inserted) {
        setData(prev => ({
          ...prev,
          logs: prev.logs.map(l => l.id === 'temp' ? inserted : l)
        }))
      }
    }
  }

  const handleSaveNumeric = async (habitId) => {
    const val = parseFloat(numericInputs[habitId])
    const currentLog = data.logs.find(l => l.habit_id === habitId)
    
    if (isNaN(val)) {
      // If empty and exists, delete
      if (currentLog) {
        const newLogs = data.logs.filter(l => l.id !== currentLog.id)
        setData(prev => ({ ...prev, logs: newLogs }))
        await supabase.from('logs').delete().eq('id', currentLog.id)
      }
      return
    }

    if (currentLog) {
      if (currentLog.value === val) return // no change
      // Update
      const newLogs = data.logs.map(l => l.id === currentLog.id ? { ...l, value: val } : l)
      setData(prev => ({ ...prev, logs: newLogs }))
      await supabase.from('logs').update({ value: val }).eq('id', currentLog.id)
    } else {
      // Insert
      const tempLog = { id: 'temp', habit_id: habitId, log_date: dateString, value: val }
      const newLogs = [...data.logs, tempLog]
      setData(prev => ({ ...prev, logs: newLogs }))
      
      const { data: inserted } = await supabase.from('logs').insert([{
        habit_id: habitId,
        log_date: dateString,
        value: val
      }]).select().single()
      
      if (inserted) {
        setData(prev => ({
          ...prev,
          logs: prev.logs.map(l => l.id === 'temp' ? inserted : l)
        }))
      }
    }
  }

  // Group habits by category
  const categoriesWithHabits = data.categories.map(cat => ({
    ...cat,
    habits: data.habits.filter(h => h.category_id === cat.id)
  })).filter(cat => cat.habits.length > 0)

  const uncategorizedHabits = data.habits.filter(h => !h.category_id)

  if (loading && data.categories.length === 0) return <div>Loading...</div>

  if (data.habits.length === 0 && !loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p style={{ marginBottom: '1rem' }}>No habits to track yet.</p>
        <p className="mono-text">Head to the Manage tab to set some up.</p>
      </div>
    )
  }

  const displayDate = isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div>
      <div className="date-navigator">
        <button onClick={() => navigateDate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h2 style={{ fontSize: '1.25rem' }}>{displayDate}</h2>
        <button onClick={() => navigateDate(1)} disabled={isToday}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>

      {categoriesWithHabits.map(cat => (
        <div key={cat.id} className="card">
          <div className="card-header">
            <div className="category-title">
              <div className="category-dot" style={{ backgroundColor: cat.color }} />
              <h3>{cat.name}</h3>
            </div>
          </div>
          <div>
            {cat.habits.map(habit => {
              const log = data.logs.find(l => l.habit_id === habit.id)
              
              if (habit.type === 'boolean') {
                const isLogged = !!log
                return (
                  <div key={habit.id} className="habit-item">
                    <span>{habit.name}</span>
                    <div 
                      className="bead" 
                      onClick={() => handleToggleBoolean(habit.id, log)}
                      style={{ 
                        borderColor: cat.color,
                        backgroundColor: isLogged ? cat.color : 'transparent'
                      }}
                    />
                  </div>
                )
              } else {
                return (
                  <div key={habit.id} className="habit-item">
                    <span>{habit.name}</span>
                    <div className="value-input-group">
                      <input 
                        type="number"
                        className="value-input"
                        value={numericInputs[habit.id] ?? ''}
                        onChange={e => setNumericInputs(prev => ({ ...prev, [habit.id]: e.target.value }))}
                      />
                      {habit.unit && <span className="mono-text">{habit.unit}</span>}
                      <button className="btn" onClick={() => handleSaveNumeric(habit.id)}>Log</button>
                    </div>
                  </div>
                )
              }
            })}
          </div>
        </div>
      ))}

      {uncategorizedHabits.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="category-title">
              <div className="category-dot" style={{ backgroundColor: 'var(--text-color)' }} />
              <h3>Uncategorized</h3>
            </div>
          </div>
          <div>
            {uncategorizedHabits.map(habit => {
              const log = data.logs.find(l => l.habit_id === habit.id)
              
              if (habit.type === 'boolean') {
                const isLogged = !!log
                return (
                  <div key={habit.id} className="habit-item">
                    <span>{habit.name}</span>
                    <div 
                      className="bead" 
                      onClick={() => handleToggleBoolean(habit.id, log)}
                      style={{ 
                        borderColor: 'var(--text-color)',
                        backgroundColor: isLogged ? 'var(--text-color)' : 'transparent'
                      }}
                    />
                  </div>
                )
              } else {
                return (
                  <div key={habit.id} className="habit-item">
                    <span>{habit.name}</span>
                    <div className="value-input-group">
                      <input 
                        type="number"
                        className="value-input"
                        value={numericInputs[habit.id] ?? ''}
                        onChange={e => setNumericInputs(prev => ({ ...prev, [habit.id]: e.target.value }))}
                      />
                      {habit.unit && <span className="mono-text">{habit.unit}</span>}
                      <button className="btn" onClick={() => handleSaveNumeric(habit.id)}>Log</button>
                    </div>
                  </div>
                )
              }
            })}
          </div>
        </div>
      )}
    </div>
  )
}
