const ENABLED_KEY = 'upkeep_reminder_enabled'
const TIME_KEY = 'upkeep_reminder_time'
const LAST_FIRED_KEY = 'upkeep_reminder_last_fired'

export function getReminderSettings() {
  return {
    enabled: localStorage.getItem(ENABLED_KEY) === 'true',
    time: localStorage.getItem(TIME_KEY) || '20:00'
  }
}

export function setReminderTime(time) {
  localStorage.setItem(TIME_KEY, time)
}

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function enableReminders() {
  if (!notificationsSupported()) return false
  const permission = await Notification.requestPermission()
  const granted = permission === 'granted'
  localStorage.setItem(ENABLED_KEY, granted ? 'true' : 'false')
  return granted
}

export function disableReminders() {
  localStorage.setItem(ENABLED_KEY, 'false')
}

// Fires a local notification once per day, after the reminder time, if habits are still outstanding.
// Only works while a tab is open (no service worker / push backend behind this).
export function checkAndFireReminder(remainingCount, todayStr) {
  const { enabled, time } = getReminderSettings()
  if (!enabled || !notificationsSupported() || Notification.permission !== 'granted') return
  if (remainingCount <= 0) return

  const [h, m] = time.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  if (now < target) return

  if (localStorage.getItem(LAST_FIRED_KEY) === todayStr) return

  new Notification('The Upkeep Ledger', {
    body: `You still have ${remainingCount} habit${remainingCount !== 1 ? 's' : ''} to log today.`
  })
  localStorage.setItem(LAST_FIRED_KEY, todayStr)
}
