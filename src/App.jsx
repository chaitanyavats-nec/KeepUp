import { useState } from 'react'
import Today from './Today'
import Trends from './Trends'
import Manage from './Manage'

function App() {
  const [activeTab, setActiveTab] = useState('today') // today, trends, manage

  return (
    <div className="container">
      <header className="app-header">
        <div className="wordmark">The Upkeep Ledger</div>
      </header>

      <div className="nav-tabs" style={{ marginBottom: '2rem' }}>
        <button 
          className="nav-tab" 
          data-active={activeTab === 'today'}
          onClick={() => setActiveTab('today')}
        >
          Today
        </button>
        <button 
          className="nav-tab" 
          data-active={activeTab === 'trends'}
          onClick={() => setActiveTab('trends')}
        >
          Trends
        </button>
        <button 
          className="nav-tab" 
          data-active={activeTab === 'manage'}
          onClick={() => setActiveTab('manage')}
        >
          Manage
        </button>
      </div>

      <main>
        {activeTab === 'today' && <Today />}
        {activeTab === 'trends' && <Trends />}
        {activeTab === 'manage' && <Manage />}
      </main>
    </div>
  )
}

export default App
