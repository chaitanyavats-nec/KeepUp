import { useState, useEffect } from 'react'
import { api } from './api'
import TaskSkeleton from './TaskSkeleton'

const COLORS = ['#A9667C', '#3F5E4E', '#B8823C', '#4E5F70', '#99684C', '#564654']

export default function Manage() {
  const [categories, setCategories] = useState([])
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)

  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(COLORS[0])

  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitCategoryId, setNewHabitCategoryId] = useState('')
  const [newHabitType, setNewHabitType] = useState('boolean')
  const [newHabitUnit, setNewHabitUnit] = useState('')

  const [editingHabitId, setEditingHabitId] = useState(null)
  const [editHabitName, setEditHabitName] = useState('')
  const [editHabitCategoryId, setEditHabitCategoryId] = useState('')
  const [editHabitType, setEditHabitType] = useState('boolean')
  const [editHabitUnit, setEditHabitUnit] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [cats, habs] = await Promise.all([
      api('getCategories'),
      api('getHabits')
    ])
    if (cats) setCategories(cats)
    if (habs) {
      setHabits(habs)
      if (cats && cats.length > 0 && !newHabitCategoryId) {
        setNewHabitCategoryId(cats[0].id)
      }
    }
    setLoading(false)
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    try {
      await api('addCategory', {
        name: newCategoryName,
        color: newCategoryColor,
        sort_order: categories.length
      })
      setNewCategoryName('')
      fetchData()
    } catch (error) {
      console.error(error)
    }
  }

  const handleDeleteCategory = async (id) => {
    await api('deleteCategory', { id })
    fetchData()
  }

  const handleAddHabit = async (e) => {
    e.preventDefault()
    if (!newHabitName.trim()) return
    try {
      const unit = newHabitType === 'numeric' 
        ? newHabitUnit 
        : (newHabitType === 'duration' ? (newHabitUnit || 'mins') : (newHabitType === 'protein' ? 'g' : null))
        
      await api('addHabit', {
        category_id: newHabitCategoryId || null,
        name: newHabitName,
        type: newHabitType,
        unit: unit,
        sort_order: habits.length
      })
      setNewHabitName('')
      setNewHabitUnit('')
      fetchData()
    } catch (error) {
      console.error(error)
    }
  }

  const handleArchiveHabit = async (id, currentArchived) => {
    await api('toggleArchiveHabit', { id, archived: !currentArchived })
    fetchData()
  }

  const startEditingHabit = (habit) => {
    setEditingHabitId(habit.id)
    setEditHabitName(habit.name)
    setEditHabitCategoryId(habit.category_id || '')
    setEditHabitType(habit.type)
    setEditHabitUnit(habit.unit || '')
  }

  const handleUpdateHabit = async (e) => {
    e.preventDefault()
    if (!editHabitName.trim()) return
    try {
      const unit = editHabitType === 'numeric' 
        ? editHabitUnit 
        : (editHabitType === 'duration' ? (editHabitUnit || 'mins') : (editHabitType === 'protein' ? 'g' : null))
      
      await api('updateHabit', {
        id: editingHabitId,
        category_id: editHabitCategoryId || null,
        name: editHabitName,
        type: editHabitType,
        unit: unit
      })
      setEditingHabitId(null)
      fetchData()
    } catch (error) {
      console.error(error)
    }
  }

  if (loading) return <TaskSkeleton />

  const getTypeLabel = (habit) => {
    if (habit.type === 'duration') return `Duration (${habit.unit || 'mins'})`
    if (habit.type === 'protein') return 'Protein Tracker (g)'
    if (habit.type === 'numeric') return `Numeric${habit.unit ? ` (${habit.unit})` : ''}`
    return 'Consistency'
  }

  return (
    <div className="fade-in">
      <div>
        <h3 className="section-title">Categories</h3>
        <div className="modern-card">
          <form onSubmit={handleAddCategory} style={{ marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#555' }}>Category Name</label>
              <input 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)} 
                placeholder="e.g. Health"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #aaa', background: 'transparent' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#555' }}>Color</label>
              <div className="color-picker" style={{ display: 'flex', gap: '0.5rem' }}>
                {COLORS.map(color => (
                  <div 
                    key={color}
                    className="color-option"
                    style={{ 
                      backgroundColor: color, 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%',
                      border: newCategoryColor === color ? '2px solid #000' : '2px solid transparent'
                    }}
                    onClick={() => setNewCategoryColor(color)}
                  />
                ))}
              </div>
            </div>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '8px', backgroundColor: '#333', color: '#fff', fontWeight: 'bold' }} type="submit">Add Category</button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {categories.map(cat => (
              <div key={cat.id} className="modern-habit-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ backgroundColor: cat.color, width: '12px', height: '12px', borderRadius: '50%' }} />
                  <span>{cat.name}</span>
                </div>
                <button style={{ color: '#d9534f', fontSize: '0.8rem' }} onClick={() => handleDeleteCategory(cat.id)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="section-title">Habits</h3>
        <div className="modern-card">
          <form onSubmit={handleAddHabit} style={{ marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#555' }}>Habit Name</label>
              <input 
                value={newHabitName} 
                onChange={e => setNewHabitName(e.target.value)} 
                placeholder="e.g. Deep Work, Read"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #aaa', background: 'transparent' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#555' }}>Category</label>
              <select 
                value={newHabitCategoryId} 
                onChange={e => setNewHabitCategoryId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #aaa', background: 'transparent' }}
              >
                <option value="">Uncategorized</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#555' }}>Type</label>
              <select 
                value={newHabitType} 
                onChange={e => setNewHabitType(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #aaa', background: 'transparent' }}
              >
                <option value="boolean">Consistency (Done/Not done)</option>
                <option value="duration">Duration (Timer / Range / Input)</option>
                <option value="numeric">Value (Number)</option>
                <option value="protein">Protein Tracker (Food checklist)</option>
              </select>
            </div>

            {newHabitType === 'duration' && (
              <>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#555' }}>Unit (Optional)</label>
                  <input 
                    value={newHabitUnit} 
                    onChange={e => setNewHabitUnit(e.target.value)} 
                    placeholder="e.g. mins, hrs (default: mins)"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #aaa', background: 'transparent' }}
                  />
                </div>
                <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(184,130,60,0.08)', borderRadius: '8px' }}>
                  ⏱️ Track time with an active stopwatch timer, set a start/end time range, or log total minutes directly.
                </div>
              </>
            )}

            {newHabitType === 'numeric' && (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#555' }}>Unit (Optional)</label>
                <input 
                  value={newHabitUnit} 
                  onChange={e => setNewHabitUnit(e.target.value)} 
                  placeholder="e.g. pages, km"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #aaa', background: 'transparent' }}
                />
              </div>
            )}

            {newHabitType === 'protein' && (
              <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(123,94,167,0.08)', borderRadius: '8px' }}>
                🥩 This creates a food checklist. Check what you ate each day and the app auto-sums protein grams.
              </div>
            )}
            <button style={{ padding: '0.5rem 1rem', borderRadius: '8px', backgroundColor: '#333', color: '#fff', fontWeight: 'bold' }} type="submit">Add Habit</button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {habits.map(habit => (
              <div key={habit.id} className="modern-habit-item" style={{ opacity: habit.archived ? 0.5 : 1, flexDirection: 'column', alignItems: 'stretch' }}>
                {editingHabitId === habit.id ? (
                  <form onSubmit={handleUpdateHabit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 0' }}>
                    <input 
                      value={editHabitName} 
                      onChange={e => setEditHabitName(e.target.value)} 
                      style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #aaa' }}
                    />
                    <select 
                      value={editHabitCategoryId} 
                      onChange={e => setEditHabitCategoryId(e.target.value)}
                      style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #aaa' }}
                    >
                      <option value="">Uncategorized</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <select 
                      value={editHabitType} 
                      onChange={e => setEditHabitType(e.target.value)}
                      style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #aaa' }}
                    >
                      <option value="boolean">Consistency (Done/Not done)</option>
                      <option value="duration">Duration</option>
                      <option value="numeric">Value (Number)</option>
                      <option value="protein">Protein Tracker</option>
                    </select>
                    {(editHabitType === 'numeric' || editHabitType === 'duration') && (
                      <input 
                        value={editHabitUnit} 
                        onChange={e => setEditHabitUnit(e.target.value)} 
                        placeholder={editHabitType === 'duration' ? 'mins' : 'unit'}
                        style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #aaa' }}
                      />
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button type="submit" style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', background: '#333', color: '#fff' }}>Save</button>
                      <button type="button" onClick={() => setEditingHabitId(null)} style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', background: '#ccc' }}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <div style={{ fontSize: '0.95rem' }}>{habit.name}</div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: habit.type === 'protein' 
                          ? 'var(--accent-protein)' 
                          : (habit.type === 'duration' ? 'var(--accent-amber)' : '#666') 
                      }}>
                        {getTypeLabel(habit)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button style={{ fontSize: '0.8rem', color: '#007bff' }} onClick={() => startEditingHabit(habit)}>
                        Edit
                      </button>
                      <button style={{ fontSize: '0.8rem', color: '#555' }} onClick={() => handleArchiveHabit(habit.id, habit.archived)}>
                        {habit.archived ? 'Unarchive' : 'Archive'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
