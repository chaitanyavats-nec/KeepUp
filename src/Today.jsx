import { useState, useEffect } from 'react'
import { api } from './api'

export default function Today() {
  const [data, setData] = useState({ categories: [], habits: [], logs: [] })
  const [loading, setLoading] = useState(true)

  // Local state for optimistic updates on numeric values
  const [numericInputs, setNumericInputs] = useState({})

  const getLocalDateString = (d) => {
    const offset = d.getTimezoneOffset()
    const localDate = new Date(d.getTime() - (offset * 60 * 1000))
    return localDate.toISOString().split('T')[0]
  }

  const dateString = getLocalDateString(new Date())

  useEffect(() => {
    fetchTodayData()
  }, [])

  const fetchTodayData = async () => {
    setLoading(true)
    
    const [cats, habs, logs] = await Promise.all([
      api('getCategories'),
      api('getHabits', { archived: false }),
      api('getLogsByDate', { date: dateString })
    ])

    setData({ categories: cats || [], habits: habs || [], logs: logs || [] })

    // Initialize numeric inputs state
    const inputs = {}
    if (habs) {
      habs.filter(h => h.type === 'numeric').forEach(h => {
        const log = logs?.find(l => l.habit_id === h.id)
        inputs[h.id] = log ? log.value.toString() : ''
      })
    }
    setNumericInputs(inputs)
    setLoading(false)
  }

  const handleToggleBoolean = async (habitId, currentLog) => {
    // Optimistic update
    const isLogged = !!currentLog
    let newLogs = [...data.logs]

    if (isLogged) {
      newLogs = newLogs.filter(l => l.id !== currentLog.id)
      setData(prev => ({ ...prev, logs: newLogs }))
      await api('deleteLog', { id: currentLog.id })
    } else {
      const tempLog = { id: 'temp', habit_id: habitId, log_date: dateString, value: 1 }
      newLogs.push(tempLog)
      setData(prev => ({ ...prev, logs: newLogs }))
      
      const inserted = await api('addLog', {
        habit_id: habitId,
        log_date: dateString,
        value: 1
      })
      
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
        await api('deleteLog', { id: currentLog.id })
      }
      return
    }

    if (currentLog) {
      if (currentLog.value === val) return // no change
      // Update
      const newLogs = data.logs.map(l => l.id === currentLog.id ? { ...l, value: val } : l)
      setData(prev => ({ ...prev, logs: newLogs }))
      await api('updateLog', { id: currentLog.id, value: val })
    } else {
      // Insert
      const tempLog = { id: 'temp', habit_id: habitId, log_date: dateString, value: val }
      const newLogs = [...data.logs, tempLog]
      setData(prev => ({ ...prev, logs: newLogs }))
      
      const inserted = await api('addLog', {
        habit_id: habitId,
        log_date: dateString,
        value: val
      })
      
      if (inserted) {
        setData(prev => ({
          ...prev,
          logs: prev.logs.map(l => l.id === 'temp' ? inserted : l)
        }))
      }
    }
  }

  if (loading) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading...</div>

  // Instead of real categories mapped directly, we match the structure from the image:
  // We'll just render whatever habits exist under the category names provided.
  // We can fallback to the mock category titles like "It's time for:", "Follow-up On:"
  
  const mockTitles = ["It's time for:", "Follow-up On:", "You're done with:"]

  const categoriesWithHabits = data.categories.map((cat, idx) => ({
    ...cat,
    displayTitle: mockTitles[idx % mockTitles.length], // Fallback to provided mock titles
    habits: data.habits.filter(h => h.category_id === cat.id)
  })).filter(cat => cat.habits.length > 0)

  const uncategorizedHabits = data.habits.filter(h => !h.category_id)

  return (
    <div>
      {categoriesWithHabits.map((cat, index) => (
        <div key={cat.id}>
          <h3 className="section-title">{cat.name}:</h3>
          <div className="modern-card">
            {cat.habits.map(habit => {
              const log = data.logs.find(l => l.habit_id === habit.id)
              
              if (habit.type === 'boolean') {
                const isLogged = !!log
                return (
                  <div key={habit.id} className="modern-habit-item">
                    <span>{habit.name}</span>
                    <button 
                      className="checkbox-square" 
                      onClick={() => handleToggleBoolean(habit.id, log)}
                      data-checked={isLogged}
                    />
                  </div>
                )
              } else {
                return (
                  <div key={habit.id} className="modern-habit-item">
                    <span>{habit.name}</span>
                    <div className="numeric-pill">
                      <input 
                        type="number"
                        value={numericInputs[habit.id] ?? ''}
                        onChange={e => setNumericInputs(prev => ({ ...prev, [habit.id]: e.target.value }))}
                        onBlur={() => handleSaveNumeric(habit.id)}
                      />
                      <span>{habit.unit || 'g'}</span>
                    </div>
                  </div>
                )
              }
            })}
          </div>
        </div>
      ))}

      {uncategorizedHabits.length > 0 && (
        <div>
          <h3 className="section-title">Other:</h3>
          <div className="modern-card">
            {uncategorizedHabits.map(habit => {
              const log = data.logs.find(l => l.habit_id === habit.id)
              
              if (habit.type === 'boolean') {
                const isLogged = !!log
                return (
                  <div key={habit.id} className="modern-habit-item">
                    <span>{habit.name}</span>
                    <button 
                      className="checkbox-square" 
                      onClick={() => handleToggleBoolean(habit.id, log)}
                      data-checked={isLogged}
                    />
                  </div>
                )
              } else {
                return (
                  <div key={habit.id} className="modern-habit-item">
                    <span>{habit.name}</span>
                    <div className="numeric-pill">
                      <input 
                        type="number"
                        value={numericInputs[habit.id] ?? ''}
                        onChange={e => setNumericInputs(prev => ({ ...prev, [habit.id]: e.target.value }))}
                        onBlur={() => handleSaveNumeric(habit.id)}
                      />
                      <span>{habit.unit || 'g'}</span>
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
