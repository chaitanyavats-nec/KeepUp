import { useState, useEffect } from 'react'
import { api } from './api'

const OPTIONS_TYPES = ['checklist', 'choice']

export default function QuickAddModal({ onClose, onAdded }) {
  const [categories, setCategories] = useState([])
  const [loadingCats, setLoadingCats] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [type, setType] = useState('boolean')
  const [unit, setUnit] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [scaleMin, setScaleMin] = useState('1')
  const [scaleMax, setScaleMax] = useState('5')
  const [items, setItems] = useState([]) // pending {label, value}
  const [itemLabel, setItemLabel] = useState('')
  const [itemValue, setItemValue] = useState('')

  useEffect(() => {
    let cancelled = false
    api('getCategories')
      .then(cats => {
        if (cancelled) return
        setCategories(cats || [])
      })
      .catch(() => { if (!cancelled) setError('Could not load categories.') })
      .finally(() => { if (!cancelled) setLoadingCats(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const addPendingItem = () => {
    if (!itemLabel.trim()) return
    const parsedValue = parseFloat(itemValue)
    setItems(prev => [...prev, { label: itemLabel.trim(), value: isNaN(parsedValue) ? null : parsedValue }])
    setItemLabel('')
    setItemValue('')
  }

  const removePendingItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError('')

    const resolvedUnit = (type === 'numeric' || type === 'checklist')
      ? (unit || null)
      : (type === 'duration' ? (unit || 'mins') : null)

    const goalPeriod = type === 'boolean' ? 'week' : 'day'
    const parsedGoal = parseFloat(goalTarget)
    const goal_target = (type !== 'scale' && type !== 'choice' && !isNaN(parsedGoal) && parsedGoal > 0) ? parsedGoal : null

    const scale_min = type === 'scale' ? (parseInt(scaleMin, 10) || 1) : null
    const scale_max = type === 'scale' ? (parseInt(scaleMax, 10) || 5) : null

    try {
      const created = await api('addHabit', {
        category_id: categoryId || null,
        name: name.trim(),
        type,
        unit: resolvedUnit,
        sort_order: 999,
        goal_target,
        goal_period: goal_target ? goalPeriod : null,
        scale_min,
        scale_max
      })

      if (OPTIONS_TYPES.includes(type) && items.length > 0) {
        await Promise.all(items.map((item, idx) =>
          api('addHabitOption', { habit_id: created.id, label: item.label, value: item.value, sort_order: idx })
        ))
      }

      onAdded()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to add habit.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Quick Add Habit</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="field-label">Habit Name</label>
            <input
              className="text-input"
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Read, Meditate"
            />
          </div>

          <div className="form-group">
            <label className="field-label">Category</label>
            <select className="select-input" value={categoryId} onChange={e => setCategoryId(e.target.value)} disabled={loadingCats}>
              <option value="">Uncategorized</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="field-label">Type</label>
            <select className="select-input" value={type} onChange={e => setType(e.target.value)}>
              <option value="boolean">Consistency (Done/Not done)</option>
              <option value="duration">Duration</option>
              <option value="numeric">Value (Number)</option>
              <option value="scale">Scale / Rating</option>
              <option value="checklist">Checklist (check off multiple items)</option>
              <option value="choice">Single Choice (pick one option)</option>
            </select>
          </div>

          {type === 'numeric' && (
            <div className="form-group">
              <label className="field-label">Unit (optional)</label>
              <input className="text-input" value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. pages, km" />
            </div>
          )}

          {type === 'duration' && (
            <div className="form-group">
              <label className="field-label">Unit (optional)</label>
              <input className="text-input" value={unit} onChange={e => setUnit(e.target.value)} placeholder="mins (default)" />
            </div>
          )}

          {type === 'checklist' && (
            <div className="form-group">
              <label className="field-label">Unit (optional)</label>
              <input className="text-input" value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. g, points" />
            </div>
          )}

          {type === 'scale' && (
            <div className="scale-range-fields">
              <div className="form-group">
                <label className="field-label">Min</label>
                <input className="text-input" type="number" value={scaleMin} onChange={e => setScaleMin(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="field-label">Max</label>
                <input className="text-input" type="number" value={scaleMax} onChange={e => setScaleMax(e.target.value)} />
              </div>
            </div>
          )}

          {OPTIONS_TYPES.includes(type) && (
            <div className="form-group item-editor">
              <label className="field-label">Items</label>
              {items.length > 0 && (
                <div className="item-editor-list">
                  {items.map((item, idx) => (
                    <div key={idx} className="item-editor-row">
                      <span>{item.label}{item.value != null ? ` — ${item.value}${unit || ''}` : ''}</span>
                      <button type="button" className="btn-danger" onClick={() => removePendingItem(idx)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="item-editor-add">
                <input className="text-input" value={itemLabel} onChange={e => setItemLabel(e.target.value)} placeholder="Item name" />
                {type === 'checklist' && (
                  <input className="text-input item-editor-value" type="number" value={itemValue} onChange={e => setItemValue(e.target.value)} placeholder="Value" />
                )}
                <button type="button" className="btn" onClick={addPendingItem}>Add Item</button>
              </div>
            </div>
          )}

          {type === 'boolean' && (
            <div className="form-group">
              <label className="field-label">Weekly goal (optional)</label>
              <input className="text-input" type="number" min="1" max="7" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="e.g. 5 times/week" />
            </div>
          )}

          {(type === 'numeric' || type === 'duration' || type === 'checklist') && (
            <div className="form-group">
              <label className="field-label">Daily goal (optional)</label>
              <input className="text-input" type="number" min="0" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder={`Target ${unit || 'value'} / day`} />
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <button className="btn btn-primary btn-block" type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Adding…' : 'Add Habit'}
          </button>
        </form>
      </div>
    </div>
  )
}
