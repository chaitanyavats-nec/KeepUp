import { useState } from 'react'

// Renders a habit whose log is one or more selections from a user-defined item list.
// type === 'checklist' -> multi-select, sums each selected item's value (defaulting to 1)
// type === 'choice'    -> single-select, shows the picked item's label
export default function OptionsTrackerItem({ habit, options, currentLog, onToggleOption }) {
  const [isOpen, setIsOpen] = useState(false)
  const multiple = habit.type === 'checklist'

  let selectedIds = []
  if (currentLog?.note) {
    try {
      const parsed = JSON.parse(currentLog.note)
      if (Array.isArray(parsed)) selectedIds = parsed
    } catch {
      selectedIds = []
    }
  }

  const total = options.reduce((sum, o) => sum + (selectedIds.includes(o.id) ? Number(o.value ?? 1) : 0), 0)
  const selectedOption = !multiple && selectedIds.length > 0
    ? options.find(o => o.id === selectedIds[0])
    : null

  return (
    <div className="options-section">
      <button type="button" className="options-toggle-btn" onClick={() => setIsOpen(o => !o)} aria-expanded={isOpen}>
        <span>{habit.name}</span>
        <div className="options-total-badge" data-variant={multiple ? 'checklist' : 'choice'}>
          {multiple ? `${total}${habit.unit || ''}` : (selectedOption ? selectedOption.label : 'Not set')}
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>
      <div className={`options-panel ${isOpen ? 'options-panel--open' : ''}`}>
        <div className="options-list">
          {options.length === 0 && (
            <p className="options-empty-hint">No items yet — add some for this habit in Manage.</p>
          )}
          {options.map(opt => {
            const isChecked = selectedIds.includes(opt.id)
            return (
              <button
                type="button"
                key={opt.id}
                className="options-item"
                onClick={() => onToggleOption(opt.id)}
                aria-pressed={isChecked}
              >
                <div className="options-item-left">
                  <div className={`options-check ${multiple ? '' : 'options-check--radio'} ${isChecked ? 'checked' : ''}`}>
                    {multiple && <svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" /></svg>}
                  </div>
                  <span className="options-item-name">{opt.label}</span>
                </div>
                {opt.value != null && <span className="options-item-value">{opt.value}{habit.unit || ''}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
