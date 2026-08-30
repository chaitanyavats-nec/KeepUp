import { useState, useEffect } from 'react'
import { api } from './api'
import TaskSkeleton from './TaskSkeleton'

const COLORS = ['#A9667C', '#3F5E4E', '#B8823C', '#4E5F70', '#99684C', '#564654']
const OPTIONS_TYPES = ['checklist', 'choice']

function goalFieldLabel(type) {
  return type === 'boolean' ? 'Weekly goal (times/week, optional)' : 'Daily goal (optional)'
}

function goalPeriodForType(type) {
  return type === 'boolean' ? 'week' : 'day'
}

export default function Manage() {
  const [categories, setCategories] = useState([])
  const [habits, setHabits] = useState([])
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(COLORS[0])

  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitCategoryId, setNewHabitCategoryId] = useState('')
  const [newHabitType, setNewHabitType] = useState('boolean')
  const [newHabitUnit, setNewHabitUnit] = useState('')
  const [newHabitGoal, setNewHabitGoal] = useState('')
  const [newHabitScaleMin, setNewHabitScaleMin] = useState('1')
  const [newHabitScaleMax, setNewHabitScaleMax] = useState('5')
  const [newHabitItems, setNewHabitItems] = useState([]) // pending {label, value} for checklist/choice
  const [newItemLabel, setNewItemLabel] = useState('')
  const [newItemValue, setNewItemValue] = useState('')
  const [addHabitError, setAddHabitError] = useState('')

  const [editingHabitId, setEditingHabitId] = useState(null)
  const [editHabitName, setEditHabitName] = useState('')
  const [editHabitCategoryId, setEditHabitCategoryId] = useState('')
  const [editHabitType, setEditHabitType] = useState('boolean')
  const [editHabitUnit, setEditHabitUnit] = useState('')
  const [editHabitGoal, setEditHabitGoal] = useState('')
  const [editHabitScaleMin, setEditHabitScaleMin] = useState('1')
  const [editHabitScaleMax, setEditHabitScaleMax] = useState('5')
  const [editItemLabel, setEditItemLabel] = useState('')
  const [editItemValue, setEditItemValue] = useState('')
  const [editHabitError, setEditHabitError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [cats, habs, opts] = await Promise.all([
        api('getCategories'),
        api('getHabits'),
        api('getHabitOptions')
      ])
      setCategories(cats || [])
      setHabits(habs || [])
      setOptions(opts || [])
      if (cats && cats.length > 0 && !newHabitCategoryId) {
        setNewHabitCategoryId(cats[0].id)
      }
    } catch (err) {
      setError(err.message || 'Failed to load categories and habits.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    try {
      await api('addCategory', {
        name: newCategoryName.trim(),
        color: newCategoryColor,
        sort_order: categories.length
      })
      setNewCategoryName('')
      fetchData()
    } catch (err) {
      setError(err.message || 'Failed to add category.')
    }
  }

  const handleDeleteCategory = async (id, name) => {
    if (!confirm(`Delete "${name}"? Habits in this category will become uncategorized.`)) return
    try {
      await api('deleteCategory', { id })
      fetchData()
    } catch (err) {
      setError(err.message || 'Failed to delete category.')
    }
  }

  const resolveUnit = (type, unit) => {
    if (type === 'numeric' || type === 'checklist' || type === 'scale') return unit || null
    if (type === 'duration') return unit || 'mins'
    return null
  }

  const resolveGoal = (type, goalValue) => {
    if (type === 'scale' || type === 'choice') return { goal_target: null, goal_period: null }
    const parsed = parseFloat(goalValue)
    if (isNaN(parsed) || parsed <= 0) return { goal_target: null, goal_period: null }
    return { goal_target: parsed, goal_period: goalPeriodForType(type) }
  }

  const resolveScale = (type, min, max) => {
    if (type !== 'scale') return { scale_min: null, scale_max: null }
    const parsedMin = parseInt(min, 10)
    const parsedMax = parseInt(max, 10)
    return {
      scale_min: isNaN(parsedMin) ? 1 : parsedMin,
      scale_max: isNaN(parsedMax) ? 5 : parsedMax
    }
  }

  const addPendingItem = () => {
    if (!newItemLabel.trim()) return
    const parsedValue = parseFloat(newItemValue)
    setNewHabitItems(prev => [...prev, { label: newItemLabel.trim(), value: isNaN(parsedValue) ? null : parsedValue }])
    setNewItemLabel('')
    setNewItemValue('')
  }

  const removePendingItem = (idx) => {
    setNewHabitItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleAddHabit = async (e) => {
    e.preventDefault()
    if (!newHabitName.trim()) return
    setAddHabitError('')
    try {
      const { goal_target, goal_period } = resolveGoal(newHabitType, newHabitGoal)
      const { scale_min, scale_max } = resolveScale(newHabitType, newHabitScaleMin, newHabitScaleMax)
      const created = await api('addHabit', {
        category_id: newHabitCategoryId || null,
        name: newHabitName.trim(),
        type: newHabitType,
        unit: resolveUnit(newHabitType, newHabitUnit),
        sort_order: habits.length,
        goal_target,
        goal_period,
        scale_min,
        scale_max
      })

      if (OPTIONS_TYPES.includes(newHabitType) && newHabitItems.length > 0) {
        await Promise.all(newHabitItems.map((item, idx) =>
          api('addHabitOption', { habit_id: created.id, label: item.label, value: item.value, sort_order: idx })
        ))
      }

      setNewHabitName('')
      setNewHabitUnit('')
      setNewHabitGoal('')
      setNewHabitScaleMin('1')
      setNewHabitScaleMax('5')
      setNewHabitItems([])
      fetchData()
    } catch (err) {
      setAddHabitError(err.message || 'Failed to add habit.')
    }
  }

  const handleArchiveHabit = async (id, currentArchived) => {
    try {
      await api('toggleArchiveHabit', { id, archived: !currentArchived })
      fetchData()
    } catch (err) {
      setError(err.message || 'Failed to update habit.')
    }
  }

  const startEditingHabit = (habit) => {
    setEditingHabitId(habit.id)
    setEditHabitName(habit.name)
    setEditHabitCategoryId(habit.category_id || '')
    setEditHabitType(habit.type)
    setEditHabitUnit(habit.unit || '')
    setEditHabitGoal(habit.goal_target != null ? String(habit.goal_target) : '')
    setEditHabitScaleMin(habit.scale_min != null ? String(habit.scale_min) : '1')
    setEditHabitScaleMax(habit.scale_max != null ? String(habit.scale_max) : '5')
    setEditItemLabel('')
    setEditItemValue('')
    setEditHabitError('')
  }

  const handleUpdateHabit = async (e) => {
    e.preventDefault()
    if (!editHabitName.trim()) return
    try {
      const { goal_target, goal_period } = resolveGoal(editHabitType, editHabitGoal)
      const { scale_min, scale_max } = resolveScale(editHabitType, editHabitScaleMin, editHabitScaleMax)
      await api('updateHabit', {
        id: editingHabitId,
        category_id: editHabitCategoryId || null,
        name: editHabitName.trim(),
        type: editHabitType,
        unit: resolveUnit(editHabitType, editHabitUnit),
        goal_target,
        goal_period,
        scale_min,
        scale_max
      })
      setEditingHabitId(null)
      fetchData()
    } catch (err) {
      setEditHabitError(err.message || 'Failed to update habit.')
    }
  }

  const addLiveItem = async (habitId) => {
    if (!editItemLabel.trim()) return
    try {
      const parsedValue = parseFloat(editItemValue)
      await api('addHabitOption', {
        habit_id: habitId,
        label: editItemLabel.trim(),
        value: isNaN(parsedValue) ? null : parsedValue,
        sort_order: options.filter(o => o.habit_id === habitId).length
      })
      setEditItemLabel('')
      setEditItemValue('')
      fetchData()
    } catch (err) {
      setEditHabitError(err.message || 'Failed to add item.')
    }
  }

  const deleteLiveItem = async (optionId) => {
    try {
      await api('deleteHabitOption', { id: optionId })
      fetchData()
    } catch (err) {
      setEditHabitError(err.message || 'Failed to remove item.')
    }
  }

  if (loading) return <TaskSkeleton />

  const getTypeLabel = (habit) => {
    if (habit.type === 'duration') return `Duration (${habit.unit || 'mins'})`
    if (habit.type === 'checklist') return `Checklist${habit.unit ? ` (${habit.unit})` : ''}`
    if (habit.type === 'scale') return `Scale (${habit.scale_min ?? 1}-${habit.scale_max ?? 5})`
    if (habit.type === 'choice') return 'Single Choice'
    if (habit.type === 'numeric') return `Numeric${habit.unit ? ` (${habit.unit})` : ''}`
    return 'Consistency'
  }

  const getGoalLabel = (habit) => {
    if (!habit.goal_target) return null
    if (habit.goal_period === 'week') return `Goal: ${habit.goal_target}x/week`
    return `Goal: ${habit.goal_target}${habit.unit ? ` ${habit.unit}` : ''}/day`
  }

  const accentForType = (type) => {
    if (type === 'duration') return 'var(--accent-amber)'
    if (type === 'checklist') return 'var(--accent-protein)'
    if (type === 'choice') return 'var(--accent-slate)'
    return 'var(--muted-text)'
  }

  return (
    <div className="fade-in">
      <h1 className="page-title">Manage</h1>

      {error && (
        <div className="error-state" style={{ padding: '1rem' }}>
          <div className="error-state-title">{error}</div>
          <button className="btn" onClick={fetchData}>Retry</button>
        </div>
      )}

      <div>
        <h3 className="settings-header">Categories</h3>
        <div className="modern-card">
          <form onSubmit={handleAddCategory} style={{ marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="field-label">Category Name</label>
              <input
                className="text-input"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="e.g. Health"
              />
            </div>
            <div className="form-group">
              <label className="field-label">Color</label>
              <div className="color-picker">
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className="color-option"
                    data-selected={newCategoryColor === color}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewCategoryColor(color)}
                    aria-label={`Select color ${color}`}
                    aria-pressed={newCategoryColor === color}
                  />
                ))}
              </div>
            </div>
            <button className="btn btn-primary" type="submit">Add Category</button>
          </form>

          <div>
            {categories.map(cat => (
              <div key={cat.id} className="list-row">
                <div className="list-row-left">
                  <div className="list-row-swatch" style={{ backgroundColor: cat.color }} />
                  <span>{cat.name}</span>
                </div>
                <button className="btn-danger" onClick={() => handleDeleteCategory(cat.id, cat.name)}>Delete</button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="habit-row-meta" style={{ padding: '0.5rem 0' }}>No categories yet.</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="settings-header">Habits</h3>
        <div className="modern-card">
          <form onSubmit={handleAddHabit} style={{ marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="field-label">Habit Name</label>
              <input
                className="text-input"
                value={newHabitName}
                onChange={e => setNewHabitName(e.target.value)}
                placeholder="e.g. Deep Work, Read"
              />
            </div>
            <div className="form-group">
              <label className="field-label">Category</label>
              <select
                className="select-input"
                value={newHabitCategoryId}
                onChange={e => setNewHabitCategoryId(e.target.value)}
              >
                <option value="">Uncategorized</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="field-label">Type</label>
              <select
                className="select-input"
                value={newHabitType}
                onChange={e => setNewHabitType(e.target.value)}
              >
                <option value="boolean">Consistency (Done/Not done)</option>
                <option value="duration">Duration (Timer / Range / Input)</option>
                <option value="numeric">Value (Number)</option>
                <option value="scale">Scale / Rating (e.g. mood 1-5)</option>
                <option value="checklist">Checklist (check off multiple items)</option>
                <option value="choice">Single Choice (pick one option)</option>
              </select>
            </div>

            {newHabitType === 'duration' && (
              <>
                <div className="form-group">
                  <label className="field-label">Unit (Optional)</label>
                  <input
                    className="text-input"
                    value={newHabitUnit}
                    onChange={e => setNewHabitUnit(e.target.value)}
                    placeholder="e.g. mins, hrs (default: mins)"
                  />
                </div>
                <div className="hint-box hint-box-amber">
                  ⏱️ Track time with an active stopwatch timer, set a start/end time range, or log total minutes directly.
                </div>
              </>
            )}

            {newHabitType === 'numeric' && (
              <div className="form-group">
                <label className="field-label">Unit (Optional)</label>
                <input
                  className="text-input"
                  value={newHabitUnit}
                  onChange={e => setNewHabitUnit(e.target.value)}
                  placeholder="e.g. pages, km"
                />
              </div>
            )}

            {newHabitType === 'scale' && (
              <div className="scale-range-fields">
                <div className="form-group">
                  <label className="field-label">Min</label>
                  <input
                    className="text-input"
                    type="number"
                    value={newHabitScaleMin}
                    onChange={e => setNewHabitScaleMin(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="field-label">Max</label>
                  <input
                    className="text-input"
                    type="number"
                    value={newHabitScaleMax}
                    onChange={e => setNewHabitScaleMax(e.target.value)}
                  />
                </div>
              </div>
            )}

            {newHabitType === 'checklist' && (
              <>
                <div className="form-group">
                  <label className="field-label">Unit (Optional)</label>
                  <input
                    className="text-input"
                    value={newHabitUnit}
                    onChange={e => setNewHabitUnit(e.target.value)}
                    placeholder="e.g. g, points"
                  />
                </div>
                <div className="hint-box hint-box-protein">
                  ✅ Add the items below. Each day you check off what applies and the app sums their values (e.g. a protein tracker made of foods and grams).
                </div>
              </>
            )}

            {newHabitType === 'choice' && (
              <div className="hint-box hint-box-slate">
                🔘 Add the options below. Each day you pick exactly one, e.g. "Workout type: Run / Lift / Rest".
              </div>
            )}

            {OPTIONS_TYPES.includes(newHabitType) && (
              <div className="form-group item-editor">
                <label className="field-label">Items</label>
                {newHabitItems.length > 0 && (
                  <div className="item-editor-list">
                    {newHabitItems.map((item, idx) => (
                      <div key={idx} className="item-editor-row">
                        <span>{item.label}{item.value != null ? ` — ${item.value}${newHabitUnit || ''}` : ''}</span>
                        <button type="button" className="btn-danger" onClick={() => removePendingItem(idx)}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="item-editor-add">
                  <input
                    className="text-input"
                    value={newItemLabel}
                    onChange={e => setNewItemLabel(e.target.value)}
                    placeholder="Item name"
                  />
                  {newHabitType === 'checklist' && (
                    <input
                      className="text-input item-editor-value"
                      type="number"
                      value={newItemValue}
                      onChange={e => setNewItemValue(e.target.value)}
                      placeholder="Value"
                    />
                  )}
                  <button type="button" className="btn" onClick={addPendingItem}>Add Item</button>
                </div>
              </div>
            )}

            {(newHabitType === 'boolean' || newHabitType === 'numeric' || newHabitType === 'duration' || newHabitType === 'checklist') && (
              <div className="form-group">
                <label className="field-label">{goalFieldLabel(newHabitType)}</label>
                <input
                  className="text-input"
                  type="number"
                  min={newHabitType === 'boolean' ? 1 : 0}
                  max={newHabitType === 'boolean' ? 7 : undefined}
                  value={newHabitGoal}
                  onChange={e => setNewHabitGoal(e.target.value)}
                  placeholder={newHabitType === 'boolean' ? 'e.g. 5' : 'e.g. 30'}
                />
              </div>
            )}

            {addHabitError && <div className="form-error">{addHabitError}</div>}
            <button className="btn btn-primary" type="submit">Add Habit</button>
          </form>

          <div>
            {habits.map(habit => (
              <div key={habit.id} className={`habit-row ${habit.archived ? 'archived' : ''}`}>
                {editingHabitId === habit.id ? (
                  <form onSubmit={handleUpdateHabit} className="habit-edit-form">
                    <input
                      className="text-input"
                      value={editHabitName}
                      onChange={e => setEditHabitName(e.target.value)}
                    />
                    <select
                      className="select-input"
                      value={editHabitCategoryId}
                      onChange={e => setEditHabitCategoryId(e.target.value)}
                    >
                      <option value="">Uncategorized</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <select
                      className="select-input"
                      value={editHabitType}
                      onChange={e => setEditHabitType(e.target.value)}
                    >
                      <option value="boolean">Consistency (Done/Not done)</option>
                      <option value="duration">Duration</option>
                      <option value="numeric">Value (Number)</option>
                      <option value="scale">Scale / Rating</option>
                      <option value="checklist">Checklist</option>
                      <option value="choice">Single Choice</option>
                    </select>
                    {(editHabitType === 'numeric' || editHabitType === 'duration' || editHabitType === 'checklist') && (
                      <input
                        className="text-input"
                        value={editHabitUnit}
                        onChange={e => setEditHabitUnit(e.target.value)}
                        placeholder={editHabitType === 'duration' ? 'mins' : 'unit'}
                      />
                    )}
                    {editHabitType === 'scale' && (
                      <div className="scale-range-fields">
                        <input
                          className="text-input"
                          type="number"
                          value={editHabitScaleMin}
                          onChange={e => setEditHabitScaleMin(e.target.value)}
                          placeholder="Min"
                        />
                        <input
                          className="text-input"
                          type="number"
                          value={editHabitScaleMax}
                          onChange={e => setEditHabitScaleMax(e.target.value)}
                          placeholder="Max"
                        />
                      </div>
                    )}
                    {OPTIONS_TYPES.includes(editHabitType) && (
                      <div className="item-editor">
                        <label className="field-label">Items</label>
                        <div className="item-editor-list">
                          {options.filter(o => o.habit_id === habit.id).map(opt => (
                            <div key={opt.id} className="item-editor-row">
                              <span>{opt.label}{opt.value != null ? ` — ${opt.value}${editHabitUnit || ''}` : ''}</span>
                              <button type="button" className="btn-danger" onClick={() => deleteLiveItem(opt.id)}>Remove</button>
                            </div>
                          ))}
                          {options.filter(o => o.habit_id === habit.id).length === 0 && (
                            <p className="habit-row-meta">No items yet.</p>
                          )}
                        </div>
                        <div className="item-editor-add">
                          <input
                            className="text-input"
                            value={editItemLabel}
                            onChange={e => setEditItemLabel(e.target.value)}
                            placeholder="Item name"
                          />
                          {editHabitType === 'checklist' && (
                            <input
                              className="text-input item-editor-value"
                              type="number"
                              value={editItemValue}
                              onChange={e => setEditItemValue(e.target.value)}
                              placeholder="Value"
                            />
                          )}
                          <button type="button" className="btn" onClick={() => addLiveItem(habit.id)}>Add Item</button>
                        </div>
                      </div>
                    )}
                    {(editHabitType === 'boolean' || editHabitType === 'numeric' || editHabitType === 'duration' || editHabitType === 'checklist') && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="field-label">{goalFieldLabel(editHabitType)}</label>
                        <input
                          className="text-input"
                          type="number"
                          min={editHabitType === 'boolean' ? 1 : 0}
                          max={editHabitType === 'boolean' ? 7 : undefined}
                          value={editHabitGoal}
                          onChange={e => setEditHabitGoal(e.target.value)}
                        />
                      </div>
                    )}
                    {editHabitError && <div className="form-error">{editHabitError}</div>}
                    <div className="habit-edit-actions">
                      <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                      <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setEditingHabitId(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="list-row">
                    <div>
                      <div className="habit-row-name">{habit.name}</div>
                      <div
                        className="habit-row-meta"
                        style={{ color: accentForType(habit.type) }}
                      >
                        {getTypeLabel(habit)}{getGoalLabel(habit) ? ` · ${getGoalLabel(habit)}` : ''}
                      </div>
                    </div>
                    <div className="list-row-actions">
                      <button className="btn-link" onClick={() => startEditingHabit(habit)}>Edit</button>
                      <button className="btn-link" onClick={() => handleArchiveHabit(habit.id, habit.archived)}>
                        {habit.archived ? 'Unarchive' : 'Archive'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {habits.length === 0 && (
              <p className="habit-row-meta" style={{ padding: '0.5rem 0' }}>No habits yet. Add one above.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
