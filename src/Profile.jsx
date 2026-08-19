export default function Profile() {
  return (
    <div>
      <h3 className="section-title">Your Profile</h3>
      <div className="modern-card" style={{ padding: '2rem 1rem', textAlign: 'center', alignItems: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#999', marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontSize: '2rem' }}>
          U
        </div>
        <h2 style={{ marginBottom: '0.25rem', fontSize: '1.2rem' }}>Productive User</h2>
        <p style={{ color: '#555', marginBottom: '2rem', fontSize: '0.9rem' }}>Ready to crush today's goals!</p>
        
        <div style={{ width: '100%', textAlign: 'left', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
            <span>Account Settings</span>
            <span>&gt;</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
            <span>Notifications</span>
            <span>&gt;</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0' }}>
            <span>Data Export</span>
            <span>&gt;</span>
          </div>
        </div>

        <button style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', backgroundColor: '#333', color: '#fff', fontWeight: 'bold' }}>Log Out</button>
      </div>
    </div>
  )
}
