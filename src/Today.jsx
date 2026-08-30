import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import TaskSkeleton from './TaskSkeleton'
import DurationTrackerItem from './DurationTrackerItem'
import OptionsTrackerItem from './OptionsTrackerItem'
import ProgressRing from './ProgressRing'
import { DAY_NAMES, MONTH_NAMES, getLocalDateString } from './dateUtils'

export default function Today({ onOpenAdd }) {
  const [data, setData] = useState({ categories: [], habits: [], logs: [], options: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [numericInputs, setNumericInputs] = useState({})
  const [selectedDate, setSelectedDate] = useState(new Date())

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
    setError(null)

    try {
      const [cats, habs, logs, options] = await Promise.all([
        api('getCategories'),
        api('getHabits', { archived: false }),
        api('getLogsByDate', { date: dateString }),
        api('getHabitOptions')
      ])

      setData({ categories: cats || [], habits: habs || [], logs: logs || [], options: options || [] })

      // Initialize numeric inputs state
      const inputs = {}
      if (habs) {
        habs.filter(h => h.type === 'numeric').forEach(h => {
          const log = logs?.find(l => l.habit_id === h.id)
          inputs[h.id] = log ? log.value.toString() : ''
        })
      }
      setNumericInputs(inputs)
    } catch (err) {
      setError(err.message || 'Failed to load your habits.')
    } finally {
      setLoading(false)
    }
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

  // Generic handler for 'checklist' (multi-select) and 'choice' (single-select) habits
  const handleToggleOption = async (habit, optionId) => {
    const multiple = habit.type === 'checklist'
    const currentLog = data.logs.find(l => l.habit_id === habit.id)

    let selectedIds = []
    if (currentLog?.note) {
      try {
        const parsed = JSON.parse(currentLog.note)
        if (Array.isArray(parsed)) selectedIds = parsed
      } catch {
        selectedIds = []
      }
    }

    if (multiple) {
      selectedIds = selectedIds.includes(optionId)
        ? selectedIds.filter(id => id !== optionId)
        : [...selectedIds, optionId]
    } else {
      // Single-select: tapping the current selection clears it, otherwise replaces it
      selectedIds = selectedIds[0] === optionId ? [] : [optionId]
    }

    const habitOptions = data.options.filter(o => o.habit_id === habit.id)
    const total = selectedIds.reduce((sum, id) => {
      const opt = habitOptions.find(o => o.id === id)
      return sum + (opt ? Number(opt.value ?? 1) : 0)
    }, 0)
    const note = JSON.stringify(selectedIds)

    if (selectedIds.length === 0) {
      if (currentLog) {
        const newLogs = data.logs.filter(l => l.id !== currentLog.id)
        setData(prev => ({ ...prev, logs: newLogs }))
        await api('deleteLog', { id: currentLog.id })
      }
    } else if (currentLog) {
      const newLogs = data.logs.map(l => l.id === currentLog.id ? { ...l, value: total, note } : l)
      setData(prev => ({ ...prev, logs: newLogs }))
      await api('updateLog', { id: currentLog.id, value: total, note })
    } else {
      const tempLog = { id: 'temp_opt', habit_id: habit.id, log_date: dateString, value: total, note }
      const newLogs = [...data.logs, tempLog]
      setData(prev => ({ ...prev, logs: newLogs }))

      const inserted = await api('addLog', {
        habit_id: habit.id,
        log_date: dateString,
        value: total,
        note
      })

      if (inserted) {
        setData(prev => ({
          ...prev,
          logs: prev.logs.map(l => l.id === 'temp_opt' ? inserted : l)
        }))
      }
    }
  }

  // Scale/rating: tapping a number saves instantly; tapping the current value clears it
  const handleSaveScale = async (habitId, value) => {
    const currentLog = data.logs.find(l => l.habit_id === habitId)

    if (currentLog && Number(currentLog.value) === value) {
      const newLogs = data.logs.filter(l => l.id !== currentLog.id)
      setData(prev => ({ ...prev, logs: newLogs }))
      await api('deleteLog', { id: currentLog.id })
      return
    }

    if (currentLog) {
      const newLogs = data.logs.map(l => l.id === currentLog.id ? { ...l, value } : l)
      setData(prev => ({ ...prev, logs: newLogs }))
      await api('updateLog', { id: currentLog.id, value })
    } else {
      const tempLog = { id: 'temp_scale', habit_id: habitId, log_date: dateString, value }
      const newLogs = [...data.logs, tempLog]
      setData(prev => ({ ...prev, logs: newLogs }))

      const inserted = await api('addLog', {
        habit_id: habitId,
        log_date: dateString,
        value
      })

      if (inserted) {
        setData(prev => ({
          ...prev,
          logs: prev.logs.map(l => l.id === 'temp_scale' ? inserted : l)
        }))
      }
    }
  }

  if (loading) return <TaskSkeleton />

  if (error) {
    return (
      <div className="fade-in error-state">
        <div className="error-state-title">Couldn't load today's habits</div>
        <p>{error}</p>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={fetchTodayData}>Retry</button>
      </div>
    )
  }

  const categoriesWithHabits = data.categories.map((cat) => ({
    ...cat,
    habits: data.habits.filter(h => h.category_id === cat.id)
  })).filter(cat => cat.habits.length > 0)

  const uncategorizedHabits = data.habits.filter(h => !h.category_id)

  const doneCount = data.habits.filter(h => data.logs.some(l => l.habit_id === h.id)).length
  const totalCount = data.habits.length

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

    if (habit.type === 'checklist' || habit.type === 'choice') {
      const habitOptions = data.options.filter(o => o.habit_id === habit.id)
      return (
        <OptionsTrackerItem
          key={habit.id}
          habit={habit}
          options={habitOptions}
          currentLog={log}
          onToggleOption={(optionId) => handleToggleOption(habit, optionId)}
        />
      )
    }

    if (habit.type === 'scale') {
      const min = habit.scale_min ?? 1
      const max = habit.scale_max ?? 5
      const current = log ? Number(log.value) : null
      const values = []
      for (let v = min; v <= max; v++) values.push(v)

      return (
        <div key={habit.id} className="modern-habit-item scale-habit-item">
          <span>{habit.name}{habit.unit ? <span className="scale-unit-hint"> · {habit.unit}</span> : null}</span>
          <div className="scale-picker">
            {values.map(v => (
              <button
                type="button"
                key={v}
                className="scale-btn"
                data-selected={current === v}
                onClick={() => handleSaveScale(habit.id, v)}
              >
                {v}
              </button>
            ))}
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

      {totalCount > 0 && isToday && (
        <div className="today-progress-row">
          <ProgressRing done={doneCount} total={totalCount} />
          <div className="today-progress-text">
            <span className="today-progress-title">
              {doneCount === totalCount ? 'All done for today! 🎉' : "Today's progress"}
            </span>
            <span className="today-progress-sub">{doneCount} of {totalCount} habits logged</span>
          </div>
        </div>
      )}

      {totalCount === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🌱</div>
          <div className="empty-state-title">No habits yet</div>
          <div className="empty-state-sub">Add your first habit to start tracking.</div>
          {onOpenAdd && <button className="btn btn-primary" onClick={onOpenAdd}>Add a Habit</button>}
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
