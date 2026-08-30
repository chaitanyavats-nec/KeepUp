import { getLocalDateString } from './dateUtils'

export function calculateStreak(logs, habitId, todayStr = getLocalDateString(new Date())) {
  let streak = 0
  const d = new Date()

  const logToday = logs.find(l => l.habit_id === habitId && l.log_date === todayStr)
  if (!logToday) {
    d.setDate(d.getDate() - 1)
  }

  while (true) {
    const dateStr = getLocalDateString(d)
    const log = logs.find(l => l.habit_id === habitId && l.log_date === dateStr)
    if (log) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
