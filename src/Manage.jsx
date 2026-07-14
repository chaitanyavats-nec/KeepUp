import { useState, useEffect } from 'react'
import { api } from './api'

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
      await api('addHabit', {
        category_id: newHabitCategoryId || null,
        name: newHabitName,
        type: newHabitType,
        unit: newHabitType === 'numeric' ? newHabitUnit : null,
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

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="card">
        <h2>Categories</h2>
        <form onSubmit={handleAddCategory} style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label>Category Name</label>
            <input 
              value={newCategoryName} 
              onChange={e => setNewCategoryName(e.target.value)} 
              placeholder="e.g. Health"
            />
          </div>
          <div className="form-group">
            <label>Color</label>
            <div className="color-picker">
              {COLORS.map(color => (
                <div 
                  key={color}
                  className="color-option"
                  style={{ backgroundColor: color }}
                  data-selected={newCategoryColor === color}
                  onClick={() => setNewCategoryColor(color)}
                />
              ))}
            </div>
          </div>
          <button className="btn btn-primary" type="submit">Add Category</button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {categories.map(cat => (
            <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="category-dot" style={{ backgroundColor: cat.color }} />
                <span>{cat.name}</span>
              </div>
              <button className="mono-text" onClick={() => handleDeleteCategory(cat.id)}>Delete</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Habits</h2>
        <form onSubmit={handleAddHabit} style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label>Habit Name</label>
            <input 
              value={newHabitName} 
              onChange={e => setNewHabitName(e.target.value)} 
              placeholder="e.g. Read"
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={newHabitCategoryId} onChange={e => setNewHabitCategoryId(e.target.value)}>
              <option value="">Uncategorized</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={newHabitType} onChange={e => setNewHabitType(e.target.value)}>
              <option value="boolean">Consistency (Done/Not done)</option>
              <option value="numeric">Value (Number)</option>
            </select>
          </div>
          {newHabitType === 'numeric' && (
            <div className="form-group">
              <label>Unit (Optional)</label>
              <input 
                value={newHabitUnit} 
                onChange={e => setNewHabitUnit(e.target.value)} 
                placeholder="e.g. pages, mins"
              />
            </div>
          )}
          <button className="btn btn-primary" type="submit">Add Habit</button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {habits.map(habit => (
            <div key={habit.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '6px', opacity: habit.archived ? 0.5 : 1 }}>
              <div>
                <div>{habit.name}</div>
                <div className="mono-text" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {habit.type === 'numeric' ? `Numeric${habit.unit ? ` (${habit.unit})` : ''}` : 'Consistency'}
                </div>
              </div>
              <button className="mono-text" onClick={() => handleArchiveHabit(habit.id, habit.archived)}>
                {habit.archived ? 'Unarchive' : 'Archive'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
