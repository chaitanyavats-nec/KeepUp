import { useState } from 'react'
import Today from './Today'
import Trends from './Trends'
import Manage from './Manage'

function App() {
  const [activeTab, setActiveTab] = useState('today') // today, trends, manage

  return (
    <div className="app-container">
      <div className="pink-header"></div>
      
      <div className="main-content">
        <div className="header-icons">
          <button className="header-icon">
            <svg viewBox="0 0 24 24">
              <path d="M6.5 6.5l11 11M3 17l4 4M17 3l4 4M4 14l6-6M14 4l6 6M4 20l6-6M20 4l-6 6" />
            </svg>
          </button>
          <button className="header-icon">
            <svg viewBox="0 0 24 24">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 2v20M21 2a4 4 0 0 0-4 4v5h4" />
              <path d="M3 2l18 18" strokeWidth="1.5" />
            </svg>
          </button>
          <button className="header-icon">
            <svg viewBox="0 0 24 24">
              <path d="M18 11V6a2 2 0 0 0-4 0v4M14 11V4a2 2 0 0 0-4 0v7M10 11V5a2 2 0 0 0-4 0v9M6 13c0-3.5 6-3 6-3v4" />
              <path d="M18 11v3a6 6 0 0 1-12 0v-1" />
            </svg>
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'today' && <Today />}
          {activeTab === 'trends' && <Trends />}
          {activeTab === 'manage' && <Manage />}
        </div>
      </div>

      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => setActiveTab('today')}>
          <svg viewBox="0 0 24 24" fill="var(--text-dark)"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span>Home</span>
        </button>
        <button className="nav-item" onClick={() => setActiveTab('trends')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-4 4"/></svg>
          <span>Log</span>
        </button>
        <button className="nav-item plus-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          <span>Log</span>
        </button>
        <button className="nav-item" onClick={() => setActiveTab('manage')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          <span>Goals</span>
        </button>
        <button className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  )
}

export default App
