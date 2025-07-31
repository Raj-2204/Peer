import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, authHelpers, dbHelpers } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔄 Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Session error:', error)
          setError(error.message)
          setLoading(false)
          return
        }

        console.log('✅ Session loaded:', !!session)
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('👤 Loading user profile...')
          await loadUserProfile(session.user.id)
        }
        
        setLoading(false)
        console.log('✅ Auth initialization complete')
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
        setError(error.message)
        setLoading(false)
      }
    }

    getInitialSession()

    // Fallback: Force stop loading after 10 seconds
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Auth loading timeout - forcing completion')
        setLoading(false)
      }
    }, 10000)

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await loadUserProfile(session.user.id)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
      clearTimeout(loadingTimeout)
    }
  }, [])

  const loadUserProfile = async (userId) => {
    try {
      console.log('🔄 Loading profile for user:', userId)
      
      // Add timeout to prevent hanging
      const profilePromise = dbHelpers.getProfile(userId)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile query timeout')), 5000)
      )
      
      const { data, error } = await Promise.race([profilePromise, timeoutPromise])
      
      if (error) {
        console.error('❌ Profile loading error:', error)
        // If profile doesn't exist, create a basic one
        if (error.code === 'PGRST116' || error.message.includes('No rows')) {
          console.log('📝 No profile found, user needs to complete setup')
          setProfile(null) // This will trigger profile setup UI
        }
      } else {
        console.log('✅ Profile loaded:', data)
        setProfile(data)
      }
    } catch (error) {
      console.error('❌ Profile loading exception:', error)
      if (error.message === 'Profile query timeout') {
        console.warn('⏱️ Profile query timed out, continuing without profile')
      }
      setProfile(null)
    }
  }

  const signUp = async (email, password, userData) => {
    setLoading(true)
    try {
      const { data, error } = await authHelpers.signUp(email, password, userData)
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    setLoading(true)
    try {
      const { data, error } = await authHelpers.signIn(email, password)
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await authHelpers.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates) => {
    if (!user) return { data: null, error: new Error('Not authenticated') }
    
    try {
      const { data, error } = await dbHelpers.updateProfile(user.id, updates)
      if (error) throw error
      setProfile(data)
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
    loadUserProfile
  }

  // Show error state if initialization failed
  if (error && !user) {
    return (
      <div className="error-container" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: '#1e1e1e',
        color: '#ffffff',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem'
      }}>
        <h2 style={{ color: '#dc3545' }}>Authentication Error</h2>
        <p>There was an issue connecting to the authentication service.</p>
        <p style={{ fontSize: '0.9rem', color: '#999' }}>Error: {error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}