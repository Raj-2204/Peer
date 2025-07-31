function TestPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#1e1e1e', 
      color: '#ffffff',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <h1>Peer Programming App</h1>
      <p>Test deployment successful! ✅</p>
      <div style={{ fontSize: '0.9rem', color: '#999' }}>
        <p>Environment: {import.meta.env.MODE}</p>
        <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
        <p>Server URL: {import.meta.env.VITE_SERVER_URL || 'Not set'}</p>
      </div>
    </div>
  )
}

export default TestPage