import './App.css'

function App() {
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
      <h1>🚀 Peer Programming App</h1>
      <p>✅ React is working!</p>
      <div style={{ fontSize: '0.9rem', color: '#999', textAlign: 'center' }}>
        <p>Mode: {import.meta.env.MODE}</p>
        <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Connected' : '❌ Missing'}</p>
        <p>Server URL: {import.meta.env.VITE_SERVER_URL || '❌ Not set'}</p>
      </div>
      
      <button 
        onClick={() => alert('Button works!')}
        style={{
          background: 'linear-gradient(45deg, #007acc, #4fc3f7)',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '1rem'
        }}
      >
        Test Button
      </button>
    </div>
  )
}

export default App