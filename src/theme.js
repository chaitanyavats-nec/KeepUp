const THEME_KEY = 'upkeep_theme'

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem(THEME_KEY, theme)
}
