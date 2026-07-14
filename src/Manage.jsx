import { useState, useEffect } from 'react'
import { supabase } from './supabase'

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
    const [catRes, habRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('habits').select('*').order('sort_order')
    ])
    if (catRes.data) setCategories(catRes.data)
    if (habRes.data) {
      setHabits(habRes.data)
      if (catRes.data && catRes.data.length > 0 && !newHabitCategoryId) {
        setNewHabitCategoryId(catRes.data[0].id)
      }
    }
    setLoading(false)
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    const { error } = await supabase.from('categories').insert([{
      name: newCategoryName,
      color: newCategoryColor,
      sort_order: categories.length
    }])
    if (!error) {
      setNewCategoryName('')
      fetchData()
    }
  }

  const handleDeleteCategory = async (id) => {
    await supabase.from('categories').delete().eq('id', id)
    fetchData()
  }

  const handleAddHabit = async (e) => {
    e.preventDefault()
    if (!newHabitName.trim()) return
    const { error } = await supabase.from('habits').insert([{
      category_id: newHabitCategoryId || null,
      name: newHabitName,
      type: newHabitType,
      unit: newHabitType === 'numeric' ? newHabitUnit : null,
      sort_order: habits.length
    }])
    if (!error) {
      setNewHabitName('')
      setNewHabitUnit('')
      fetchData()
    }
  }

  const handleArchiveHabit = async (id, currentArchived) => {
    await supabase.from('habits').update({ archived: !currentArchived }).eq('id', id)
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
