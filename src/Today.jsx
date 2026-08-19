import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import { PROTEIN_FOODS } from './proteinFoods'
import TaskSkeleton from './TaskSkeleton'
import DurationTrackerItem from './DurationTrackerItem'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function Today() {
  const [data, setData] = useState({ categories: [], habits: [], logs: [] })
  const [loading, setLoading] = useState(true)
  const [numericInputs, setNumericInputs] = useState({})
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  // Protein checklist state
  const [proteinSelections, setProteinSelections] = useState({}) // { habitId: { foodId: true/false } }
  const [proteinPanelOpen, setProteinPanelOpen] = useState({}) // { habitId: true/false }

  const getLocalDateString = (d) => {
    const offset = d.getTimezoneOffset()
    const localDate = new Date(d.getTime() - (offset * 60 * 1000))
    return localDate.toISOString().split('T')[0]
  }

  const dateString = getLocalDateString(selectedDate)
  
  const isToday = dateString === getLocalDateString(new Date())

  // Format display date
  const dateObj = selectedDate
  const dayName = DAY_NAMES[dateObj.getDay()]
  const monthName = MONTH_NAMES[dateObj.getMonth()]
  const dayNum = dateObj.getDate()
  const year = dateObj.getFullYear()

  const fetchTodayData = useCallback(async () => {
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
      habs.filter(h => h.type === 'numeric' || h.type === 'protein').forEach(h => {
        const log = logs?.find(l => l.habit_id === h.id)
        inputs[h.id] = log ? log.value.toString() : ''
      })
    }
    setNumericInputs(inputs)

    // Load protein selections from localStorage
    if (habs) {
      const protSel = {}
      habs.filter(h => h.type === 'protein').forEach(h => {
        const key = `protein_${h.id}_${dateString}`
        const saved = localStorage.getItem(key)
        protSel[h.id] = saved ? JSON.parse(saved) : {}
      })
      setProteinSelections(protSel)
    }

    setLoading(false)
  }, [dateString])

  useEffect(() => {
    fetchTodayData()
  }, [fetchTodayData])

  const navigateDate = (direction) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + direction)
    // Don't go into the future
    if (d > new Date()) return
    setSelectedDate(d)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const handleToggleBoolean = async (habitId, currentLog) => {
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
      if (currentLog) {
        const newLogs = data.logs.filter(l => l.id !== currentLog.id)
        setData(prev => ({ ...prev, logs: newLogs }))
        await api('deleteLog', { id: currentLog.id })
      }
      return
    }

    if (currentLog) {
      if (currentLog.value === val) return
      const newLogs = data.logs.map(l => l.id === currentLog.id ? { ...l, value: val } : l)
      setData(prev => ({ ...prev, logs: newLogs }))
      await api('updateLog', { id: currentLog.id, value: val })
    } else {
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

  const handleSaveDuration = async (habitId, durationVal) => {
    const currentLog = data.logs.find(l => l.habit_id === habitId)
    const val = Math.max(0, Math.round(Number(durationVal) || 0))

    if (val === 0) {
      if (currentLog) {
        const newLogs = data.logs.filter(l => l.id !== currentLog.id)
        setData(prev => ({ ...prev, logs: newLogs }))
        await api('deleteLog', { id: currentLog.id })
      }
      return
    }

    if (currentLog) {
      const newLogs = data.logs.map(l => l.id === currentLog.id ? { ...l, value: val } : l)
      setData(prev => ({ ...prev, logs: newLogs }))
      await api('updateLog', { id: currentLog.id, value: val })
    } else {
      const tempLog = { id: 'temp_d', habit_id: habitId, log_date: dateString, value: val }
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
          logs: prev.logs.map(l => l.id === 'temp_d' ? inserted : l)
        }))
      }
    }
  }

  // Protein checklist handlers
  const toggleProteinFood = async (habitId, foodId, grams) => {
    const current = proteinSelections[habitId] || {}
    const isSelected = !!current[foodId]
    const updated = { ...current, [foodId]: !isSelected }
    
    // Update local state
    setProteinSelections(prev => ({ ...prev, [habitId]: updated }))
    
    // Save to localStorage
    const key = `protein_${habitId}_${dateString}`
    localStorage.setItem(key, JSON.stringify(updated))
    
    // Calculate total
    const totalGrams = PROTEIN_FOODS.reduce((sum, food) => {
      return sum + (updated[food.id] ? food.grams : 0)
    }, 0)
    
    // Update numeric input display
    setNumericInputs(prev => ({ ...prev, [habitId]: totalGrams.toString() }))
    
    // Save to DB
    const currentLog = data.logs.find(l => l.habit_id === habitId)
    if (totalGrams === 0) {
      if (currentLog) {
        const newLogs = data.logs.filter(l => l.id !== currentLog.id)
        setData(prev => ({ ...prev, logs: newLogs }))
        await api('deleteLog', { id: currentLog.id })
      }
    } else if (currentLog) {
      const newLogs = data.logs.map(l => l.id === currentLog.id ? { ...l, value: totalGrams } : l)
      setData(prev => ({ ...prev, logs: newLogs }))
      await api('updateLog', { id: currentLog.id, value: totalGrams })
    } else {
      const tempLog = { id: 'temp_p', habit_id: habitId, log_date: dateString, value: totalGrams }
      const newLogs = [...data.logs, tempLog]
      setData(prev => ({ ...prev, logs: newLogs }))
      
      const inserted = await api('addLog', {
        habit_id: habitId,
        log_date: dateString,
        value: totalGrams
      })
      
      if (inserted) {
        setData(prev => ({
          ...prev,
          logs: prev.logs.map(l => l.id === 'temp_p' ? inserted : l)
        }))
      }
    }
  }

  if (loading) return <TaskSkeleton />

  const categoriesWithHabits = data.categories.map((cat) => ({
    ...cat,
    habits: data.habits.filter(h => h.category_id === cat.id)
  })).filter(cat => cat.habits.length > 0)

  const uncategorizedHabits = data.habits.filter(h => !h.category_id)

  const renderHabit = (habit) => {
    const log = data.logs.find(l => l.habit_id === habit.id)

    if (habit.type === 'duration') {
      return (
        <DurationTrackerItem 
          key={habit.id}
          habit={habit}
          currentLog={log}
          dateString={dateString}
          onSaveDuration={handleSaveDuration}
        />
      )
    }

    if (habit.type === 'protein') {
      const selections = proteinSelections[habit.id] || {}
      const totalGrams = PROTEIN_FOODS.reduce((sum, food) => sum + (selections[food.id] ? food.grams : 0), 0)
      const isPanelOpen = proteinPanelOpen[habit.id]

      return (
        <div key={habit.id} className="protein-section">
          <div 
            className="protein-toggle-btn"
            onClick={() => setProteinPanelOpen(prev => ({ ...prev, [habit.id]: !prev[habit.id] }))}
          >
            <span>{habit.name}</span>
            <div className="protein-total-badge">
              {totalGrams}g
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: isPanelOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
          <div className={`protein-panel ${isPanelOpen ? 'protein-panel--open' : ''}`}>
            <div className="protein-food-list">
              {PROTEIN_FOODS.map(food => {
                const isChecked = !!selections[food.id]
                return (
                  <div 
                    key={food.id} 
                    className="protein-food-item"
                    onClick={() => toggleProteinFood(habit.id, food.id, food.grams)}
                  >
                    <div className="protein-food-left">
                      <div className={`protein-food-check ${isChecked ? 'checked' : ''}`}>
                        <svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" /></svg>
                      </div>
                      <span className="protein-food-name">{food.name}</span>
                    </div>
                    <span className="protein-food-grams">{food.grams}g</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

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
      // numeric
      return (
        <div key={habit.id} className="modern-habit-item">
          <span>{habit.name}</span>
          <div className="numeric-pill">
            <input 
              type="number"
              value={numericInputs[habit.id] ?? ''}
              onChange={e => setNumericInputs(prev => ({ ...prev, [habit.id]: e.target.value }))}
              onBlur={() => handleSaveNumeric(habit.id)}
              onKeyDown={e => e.key === 'Enter' && e.target.blur()}
            />
            <span>{habit.unit || 'g'}</span>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="fade-in">
      {/* Date Header with navigation */}
      <div className="date-header">
        <div className="date-header-left">
          <div className="date-label-day">
            {isToday ? 'Today' : dayName}
          </div>
          <div className="date-label-sub">
            {dayName}, {monthName} {dayNum}, {year}
          </div>
        </div>
        <div className="date-nav-arrows">
          {!isToday && (
            <button className="date-nav-today" onClick={goToToday}>
              Today
            </button>
          )}
          <button className="date-nav-btn" onClick={() => navigateDate(-1)}>
            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button className="date-nav-btn" onClick={() => navigateDate(1)} style={{ opacity: isToday ? 0.3 : 1 }}>
            <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      {categoriesWithHabits.map((cat) => (
        <div key={cat.id}>
          <h3 className="section-title">{cat.name}:</h3>
          <div className="modern-card">
            {cat.habits.map(habit => renderHabit(habit))}
          </div>
        </div>
      ))}

      {uncategorizedHabits.length > 0 && (
        <div>
          <h3 className="section-title">Other:</h3>
          <div className="modern-card">
            {uncategorizedHabits.map(habit => renderHabit(habit))}
          </div>
        </div>
      )}
    </div>
  )
}
