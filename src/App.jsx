import { useState, useEffect } from 'react'
import Today from './Today'
import Trends from './Trends'
import Manage from './Manage'

import Profile from './Profile'

function SplashScreen({ onDone }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(onDone, 600)
    }, 1800)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className={`splash-overlay ${exiting ? 'splash-exit' : ''}`}>
      <div className="splash-logo">
        <svg viewBox="0 0 24 24">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </div>
      <div className="splash-title">The Upkeep Ledger</div>
      <div className="splash-subtitle">Track · Measure · Grow</div>
      <div className="splash-dots">
        <div className="splash-dot" />
        <div className="splash-dot" />
        <div className="splash-dot" />
      </div>
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('today') // today, trends, manage, profile
  const [showSplash, setShowSplash] = useState(true)

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      
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
            {activeTab === 'profile' && <Profile />}
          </div>
        </div>

        <nav className="bottom-nav">
          <button className="nav-item" onClick={() => setActiveTab('today')}>
            <svg viewBox="0 0 24 24" fill={activeTab === 'today' ? 'var(--text-dark)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span>Home</span>
          </button>
          <button className="nav-item" onClick={() => setActiveTab('trends')}>
            <svg viewBox="0 0 24 24" fill={activeTab === 'trends' ? 'var(--text-dark)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-4 4"/></svg>
            <span>Log</span>
          </button>
          <button className="nav-item plus-item" onClick={() => setActiveTab('manage')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            <span>Add</span>
          </button>
          <button className="nav-item" onClick={() => setActiveTab('manage')}>
            <svg viewBox="0 0 24 24" fill={activeTab === 'manage' ? 'var(--text-dark)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            <span>Goals</span>
          </button>
          <button className="nav-item" onClick={() => setActiveTab('profile')}>
            <svg viewBox="0 0 24 24" fill={activeTab === 'profile' ? 'var(--text-dark)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Profile</span>
          </button>
        </nav>
      </div>
    </>
  )
}

export default App
