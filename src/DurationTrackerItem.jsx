import { useState, useEffect, useRef } from 'react'

export function formatDurationText(mins) {
  if (!mins || mins <= 0) return '0 mins'
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  if (h === 0) return `${m} min${m !== 1 ? 's' : ''}`
  if (m === 0) return `${h} hr${h !== 1 ? 's' : ''}`
  return `${h}h ${m}m`
}

export function formatTimerClock(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  const pad = (n) => String(n).padStart(2, '0')
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
  }
  return `${pad(mins)}:${pad(secs)}`
}

export default function DurationTrackerItem({ habit, currentLog, dateString, onSaveDuration }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('timer') // 'timer' | 'range' | 'manual'

  // Logged value in minutes for today
  const loggedMinutes = currentLog ? Number(currentLog.value) : 0

  // Mode 1: Timer State
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const timerRef = useRef(null)

  // Mode 2: Range State
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')

  // Mode 3: Direct Manual State
  const [manualInput, setManualInput] = useState('')

  // Storage key for active timer
  const storageKey = `timer_${habit.id}_${dateString}`

  // Load timer state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const { isRunning, startTimeStamp, accumulatedSecs } = JSON.parse(saved)
        if (isRunning && startTimeStamp) {
          const now = Date.now()
          const elapsed = Math.floor((now - startTimeStamp) / 1000)
          setTimerSeconds(accumulatedSecs + elapsed)
          setIsTimerRunning(true)
        } else {
          setTimerSeconds(accumulatedSecs || 0)
          setIsTimerRunning(false)
        }
      } catch (e) {
        console.error('Failed to parse timer state', e)
      }
    }
  }, [storageKey])

  // Timer Ticking Effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isTimerRunning])

  // Save active timer state to localStorage whenever running state changes
  const saveTimerToStorage = (running, secs) => {
    localStorage.setItem(storageKey, JSON.stringify({
      isRunning: running,
      startTimeStamp: running ? Date.now() : null,
      accumulatedSecs: secs
    }))
  }

  const handleStartTimer = () => {
    setIsTimerRunning(true)
    saveTimerToStorage(true, timerSeconds)
  }

  const handlePauseTimer = () => {
    setIsTimerRunning(false)
    saveTimerToStorage(false, timerSeconds)
  }

  const handleResetTimer = () => {
    setIsTimerRunning(false)
    setTimerSeconds(0)
    localStorage.removeItem(storageKey)
  }

  const handleSaveTimerDuration = (addToExisting = false) => {
    const elapsedMins = Math.max(1, Math.round(timerSeconds / 60))
    const totalToSave = addToExisting ? (loggedMinutes + elapsedMins) : elapsedMins
    
    onSaveDuration(habit.id, totalToSave)
    handleResetTimer()
  }

  // Range Duration Calculation
  const calculateRangeMinutes = () => {
    if (!startTime || !endTime) return 0
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)

    let startTotal = startH * 60 + startM
    let endTotal = endH * 60 + endM

    if (endTotal < startTotal) {
      endTotal += 24 * 60 // Over midnight
    }

    return endTotal - startTotal
  }

  const rangeMinutes = calculateRangeMinutes()

  const handleSaveRange = (addToExisting = false) => {
    if (rangeMinutes <= 0) return
    const totalToSave = addToExisting ? (loggedMinutes + rangeMinutes) : rangeMinutes
    onSaveDuration(habit.id, totalToSave)
  }

  const handleSaveManual = (addToExisting = false) => {
    const val = parseInt(manualInput, 10)
    if (isNaN(val) || val < 0) return
    const totalToSave = addToExisting ? (loggedMinutes + val) : val
    onSaveDuration(habit.id, totalToSave)
    setManualInput('')
  }

  const handleAddPresetManual = (addMins) => {
    const current = parseInt(manualInput, 10) || 0
    setManualInput((current + addMins).toString())
  }

  return (
    <div className="duration-section">
      {/* Habit Header Bar */}
      <div className="duration-header-bar" onClick={() => setIsOpen(!isOpen)}>
        <div className="duration-header-left">
          <span className="duration-habit-name">{habit.name}</span>
          {isTimerRunning && (
            <span className="duration-active-timer-badge">
              <span className="duration-live-dot" />
              {formatTimerClock(timerSeconds)}
            </span>
          )}
        </div>

        <div className="duration-header-right">
          <div className="duration-total-badge">
            ⏱️ {formatDurationText(loggedMinutes)}
            <svg 
              viewBox="0 0 24 24" 
              width="14" 
              height="14" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expandable Control Panel */}
      <div className={`duration-panel ${isOpen ? 'duration-panel--open' : ''}`}>
        {/* Mode Selector Tabs */}
        <div className="duration-tabs">
          <button 
            className={`duration-tab ${activeTab === 'timer' ? 'active' : ''}`}
            onClick={() => setActiveTab('timer')}
          >
            ⏱️ Timer
          </button>
          <button 
            className={`duration-tab ${activeTab === 'range' ? 'active' : ''}`}
            onClick={() => setActiveTab('range')}
          >
            🕒 Time Range
          </button>
          <button 
            className={`duration-tab ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            ✏️ Direct
          </button>
        </div>

        {/* Tab Content 1: Live Timer */}
        {activeTab === 'timer' && (
          <div className="duration-tab-body fade-in">
            <div className="duration-clock-display">
              {formatTimerClock(timerSeconds)}
            </div>

            <div className="duration-timer-controls">
              {!isTimerRunning ? (
                <button className="duration-btn duration-btn-start" onClick={handleStartTimer}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  {timerSeconds > 0 ? 'Resume' : 'Start Timer'}
                </button>
              ) : (
                <button className="duration-btn duration-btn-pause" onClick={handlePauseTimer}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  Pause
                </button>
              )}

              {timerSeconds > 0 && (
                <button className="duration-btn duration-btn-reset" onClick={handleResetTimer}>
                  Reset
                </button>
              )}
            </div>

            {timerSeconds > 0 && (
              <div className="duration-save-actions">
                <span className="duration-save-hint">Timed: {formatDurationText(Math.round(timerSeconds / 60))}</span>
                <div className="duration-save-btns">
                  {loggedMinutes > 0 && (
                    <button className="duration-btn duration-btn-secondary" onClick={() => handleSaveTimerDuration(true)}>
                      + Add to {formatDurationText(loggedMinutes)}
                    </button>
                  )}
                  <button className="duration-btn duration-btn-primary" onClick={() => handleSaveTimerDuration(false)}>
                    Set Logged Time
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Start and End Time Range */}
        {activeTab === 'range' && (
          <div className="duration-tab-body fade-in">
            <div className="duration-range-inputs">
              <div className="duration-field">
                <label>Start Time</label>
                <input 
                  type="time" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)} 
                />
              </div>
              <div className="duration-range-sep">to</div>
              <div className="duration-field">
                <label>End Time</label>
                <input 
                  type="time" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)} 
                />
              </div>
            </div>

            <div className="duration-range-summary">
              Calculated Duration: <strong>{formatDurationText(rangeMinutes)}</strong> ({rangeMinutes} mins)
            </div>

            <div className="duration-save-btns">
              {loggedMinutes > 0 && (
                <button className="duration-btn duration-btn-secondary" onClick={() => handleSaveRange(true)}>
                  + Add to {formatDurationText(loggedMinutes)}
                </button>
              )}
              <button className="duration-btn duration-btn-primary" onClick={() => handleSaveRange(false)}>
                Save Range Duration
              </button>
            </div>
          </div>
        )}

        {/* Tab Content 3: Direct Manual Entry */}
        {activeTab === 'manual' && (
          <div className="duration-tab-body fade-in">
            <div className="duration-manual-input-wrap">
              <input 
                type="number" 
                className="duration-manual-input"
                placeholder="0"
                value={manualInput} 
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveManual(false)}
              />
              <span className="duration-unit-tag">{habit.unit || 'mins'}</span>
            </div>

            <div className="duration-presets">
              <button className="duration-preset-chip" onClick={() => handleAddPresetManual(15)}>+15m</button>
              <button className="duration-preset-chip" onClick={() => handleAddPresetManual(30)}>+30m</button>
              <button className="duration-preset-chip" onClick={() => handleAddPresetManual(60)}>+60m</button>
              <button className="duration-preset-chip" onClick={() => handleAddPresetManual(90)}>+90m</button>
            </div>

            <div className="duration-save-btns">
              {loggedMinutes > 0 && (
                <button className="duration-btn duration-btn-secondary" onClick={() => handleSaveManual(true)}>
                  + Add to {formatDurationText(loggedMinutes)}
                </button>
              )}
              <button className="duration-btn duration-btn-primary" onClick={() => handleSaveManual(false)}>
                Save Duration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
