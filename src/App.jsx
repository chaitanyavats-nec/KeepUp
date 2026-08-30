import { useState, useEffect } from 'react'
import Today from './Today'
import Trends from './Trends'
import Manage from './Manage'
import Profile from './Profile'
import QuickAddModal from './QuickAddModal'
import { api } from './api'
import { getLocalDateString } from './dateUtils'
import { getStoredTheme, applyTheme } from './theme'
import { getReminderSettings, enableReminders, disableReminders, checkAndFireReminder, setReminderTime } from './reminders'

function SplashScreen({ onDone }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(onDone, 600)
    }, 1800)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className={`splash-overlay ${exiting ? 'splash-exit' : ''}`}>
      <div className="splash-logo">
        <svg viewBox="0 0 24 24">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </div>
      <div className="splash-title">The Upkeep Ledger</div>
      <div className="splash-subtitle">Track · Measure · Grow</div>
      <div className="splash-dots">
        <div className="splash-dot" />
        <div className="splash-dot" />
        <div className="splash-dot" />
      </div>
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('today') // today, trends, manage, profile
  const [showSplash, setShowSplash] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  const [theme, setTheme] = useState(() => getStoredTheme())
  const [reminderSettings, setReminderSettings] = useState(() => getReminderSettings())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const toggleReminders = async () => {
    if (reminderSettings.enabled) {
      disableReminders()
      setReminderSettings(getReminderSettings())
    } else {
      const granted = await enableReminders()
      setReminderSettings(getReminderSettings())
      if (!granted) {
        alert('Notifications were blocked. Enable them in your browser settings to use reminders.')
      }
    }
  }

  const handleReminderTimeChange = (time) => {
    setReminderTime(time)
    setReminderSettings(prev => ({ ...prev, time }))
  }

  const handleHabitAdded = () => {
    setRefreshKey(k => k + 1)
  }

  // Periodically checks (regardless of active tab) whether reminders should fire.
  useEffect(() => {
    const runCheck = async () => {
      if (!getReminderSettings().enabled) return
      const todayStr = getLocalDateString(new Date())
      try {
        const [habits, logs] = await Promise.all([
          api('getHabits', { archived: false }),
          api('getLogsByDate', { date: todayStr })
        ])
        const remaining = (habits?.length || 0) - (logs?.length || 0)
        checkAndFireReminder(Math.max(0, remaining), todayStr)
      } catch {
        // silently skip; will retry on next interval
      }
    }
    const interval = setInterval(runCheck, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

      <div className="app-container">
        <header className="top-bar">
          <div className="top-bar-inner">
            <div className="top-bar-brand">
              <svg viewBox="0 0 24 24">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <span>Upkeep Ledger</span>
            </div>
            <div className="top-bar-actions">
              <button
                className={`icon-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
                title="Toggle dark mode"
              >
                {theme === 'dark' ? (
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                )}
              </button>
              <button
                className={`icon-btn ${reminderSettings.enabled ? 'active' : ''}`}
                onClick={toggleReminders}
                aria-label="Toggle daily reminders"
                title="Toggle daily reminders"
              >
                {reminderSettings.enabled ? (
                  <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-9.33-5M18 8c0 7 3 9 3 9H3s3-2 3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M2 2l20 20" /></svg>
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="main-content">
          <div className="tab-content">
            {activeTab === 'today' && <Today key={`today-${refreshKey}`} onOpenAdd={() => setShowQuickAdd(true)} />}
            {activeTab === 'trends' && <Trends key={`trends-${refreshKey}`} onOpenAdd={() => setShowQuickAdd(true)} />}
            {activeTab === 'manage' && <Manage key={`manage-${refreshKey}`} />}
            {activeTab === 'profile' && (
              <Profile
                theme={theme}
                onToggleTheme={toggleTheme}
                reminderSettings={reminderSettings}
                onToggleReminders={toggleReminders}
                onReminderTimeChange={handleReminderTimeChange}
              />
            )}
          </div>
        </div>

        <nav className="bottom-nav">
          <div className="bottom-nav-inner">
            <button className="nav-item" style={{ color: activeTab === 'today' ? 'var(--tint)' : 'var(--muted-text)' }} onClick={() => setActiveTab('today')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === 'today' ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
              <span>Home</span>
            </button>
            <button className="nav-item" style={{ color: activeTab === 'trends' ? 'var(--tint)' : 'var(--muted-text)' }} onClick={() => setActiveTab('trends')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === 'trends' ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-4 4"/></svg>
              <span>Trends</span>
            </button>
            <button className="nav-item plus-item" onClick={() => setShowQuickAdd(true)} aria-label="Add habit" title="Add habit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            <button className="nav-item" style={{ color: activeTab === 'manage' ? 'var(--tint)' : 'var(--muted-text)' }} onClick={() => setActiveTab('manage')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === 'manage' ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
              <span>Manage</span>
            </button>
            <button className="nav-item" style={{ color: activeTab === 'profile' ? 'var(--tint)' : 'var(--muted-text)' }} onClick={() => setActiveTab('profile')}>
              <svg viewBox="0 0 24 24" fill={activeTab === 'profile' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>Profile</span>
            </button>
          </div>
        </nav>
      </div>

      {showQuickAdd && (
        <QuickAddModal
          onClose={() => setShowQuickAdd(false)}
          onAdded={handleHabitAdded}
        />
      )}
    </>
  )
}

export default App
