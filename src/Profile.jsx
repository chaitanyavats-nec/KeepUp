import { useState, useEffect } from 'react'
import { api } from './api'
import { getLocalDateString } from './dateUtils'
import { calculateStreak } from './streak'
import { notificationsSupported } from './reminders'

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function toCSV(categories, habits, logs) {
  const catNameById = Object.fromEntries(categories.map(c => [c.id, c.name]))
  const habitById = Object.fromEntries(habits.map(h => [h.id, h]))
  const header = ['date', 'habit', 'category', 'type', 'value', 'unit']
  const rows = logs
    .slice()
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .map(log => {
      const habit = habitById[log.habit_id]
      const row = [
        log.log_date,
        habit?.name || 'Unknown',
        habit?.category_id ? (catNameById[habit.category_id] || '') : '',
        habit?.type || '',
        log.value,
        habit?.unit || ''
      ]
      return row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    })
  return [header.join(','), ...rows].join('\n')
}

export default function Profile({ theme, onToggleTheme, reminderSettings, onToggleReminders, onReminderTimeChange }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const todayStr = getLocalDateString(new Date())
      const [cats, habs, logs] = await Promise.all([
        api('getCategories'),
        api('getHabits'),
        api('getLogsByDateRange', { startStr: '2000-01-01', endStr: todayStr })
      ])

      const activeHabits = (habs || []).filter(h => !h.archived)
      const booleanHabits = activeHabits.filter(h => h.type === 'boolean')
      const bestStreak = booleanHabits.reduce((max, h) => Math.max(max, calculateStreak(logs || [], h.id, todayStr)), 0)

      const createdDates = [...(cats || []), ...(habs || [])]
        .map(x => x.created_at)
        .filter(Boolean)
        .sort()
      const trackingSince = createdDates[0] ? new Date(createdDates[0]) : null

      setStats({
        categories: cats || [],
        habits: habs || [],
        logs: logs || [],
        activeHabitCount: activeHabits.length,
        categoryCount: (cats || []).length,
        bestStreak,
        totalLogs: (logs || []).length,
        trackingSince
      })
    } catch (err) {
      setError(err.message || 'Failed to load your stats.')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format) => {
    if (!stats) return
    setExporting(true)
    try {
      const dateTag = getLocalDateString(new Date())
      if (format === 'json') {
        const payload = {
          exported_at: new Date().toISOString(),
          categories: stats.categories,
          habits: stats.habits,
          logs: stats.logs
        }
        downloadBlob(JSON.stringify(payload, null, 2), `upkeep-ledger-${dateTag}.json`, 'application/json')
      } else {
        const csv = toCSV(stats.categories, stats.habits, stats.logs)
        downloadBlob(csv, `upkeep-ledger-${dateTag}.csv`, 'text/csv')
      }
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="fade-in">
        <h3 className="section-title">Your Profile</h3>
        <div className="modern-card skeleton-card">
          <div className="skeleton-box" style={{ width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 1rem' }} />
          <div className="skeleton-box" style={{ width: '140px', height: '18px', margin: '0 auto' }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fade-in error-state">
        <div className="error-state-title">Couldn't load your profile</div>
        <p>{error}</p>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={fetchStats}>Retry</button>
      </div>
    )
  }

  const tagline = stats.activeHabitCount === 0
    ? 'Add your first habit to get started'
    : stats.bestStreak > 0
      ? `${stats.activeHabitCount} habits · ${stats.bestStreak}-day best streak`
      : `${stats.activeHabitCount} habits tracked`

  return (
    <div className="fade-in">
      <h1 className="page-title">Profile</h1>
      <div className="modern-card" style={{ padding: 0 }}>
        <div className="profile-header">
          <div className="profile-avatar">
            <svg viewBox="0 0 24 24" width="34" height="34" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div className="profile-name">Upkeep Ledger</div>
          <div className="profile-tagline">{tagline}</div>

          <div className="profile-stats-grid">
            <div className="profile-stat">
              <span className="profile-stat-value">{stats.activeHabitCount}</span>
              <span className="profile-stat-label">Active Habits</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{stats.bestStreak}</span>
              <span className="profile-stat-label">Best Streak</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{stats.totalLogs}</span>
              <span className="profile-stat-label">Logs Recorded</span>
            </div>
          </div>
        </div>
      </div>

      <h3 className="settings-header">Appearance</h3>
      <div className="modern-card">
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Dark Mode</div>
            <div className="settings-row-sub">Switch between light and dark themes</div>
          </div>
          <button type="button" className="toggle-switch" data-on={theme === 'dark'} onClick={onToggleTheme} role="switch" aria-checked={theme === 'dark'} aria-label="Toggle dark mode">
            <div className="toggle-switch-knob" />
          </button>
        </div>
      </div>

      <h3 className="settings-header">Reminders</h3>
      <div className="modern-card">
        {notificationsSupported() ? (
          <>
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Daily Reminder</div>
                <div className="settings-row-sub">Notifies you if habits are still unlogged</div>
              </div>
              <button type="button" className="toggle-switch" data-on={reminderSettings.enabled} onClick={onToggleReminders} role="switch" aria-checked={reminderSettings.enabled} aria-label="Toggle daily reminders">
                <div className="toggle-switch-knob" />
              </button>
            </div>
            {reminderSettings.enabled && (
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Reminder Time</div>
                  <div className="settings-row-sub">Only fires while this app is open in a tab</div>
                </div>
                <input
                  type="time"
                  className="settings-time-input"
                  value={reminderSettings.time}
                  onChange={e => onReminderTimeChange(e.target.value)}
                />
              </div>
            )}
          </>
        ) : (
          <p className="settings-row-sub">Your browser doesn't support notifications.</p>
        )}
      </div>

      <h3 className="settings-header">Data</h3>
      <div className="modern-card">
        <div>
          <div className="settings-row-label" style={{ marginBottom: '0.25rem' }}>Export your data</div>
          <div className="settings-row-sub">Download every category, habit, and log you've recorded.</div>
          <div className="export-buttons">
            <button className="btn" disabled={exporting} onClick={() => handleExport('csv')}>Export CSV</button>
            <button className="btn" disabled={exporting} onClick={() => handleExport('json')}>Export JSON</button>
          </div>
        </div>
      </div>
    </div>
  )
}
