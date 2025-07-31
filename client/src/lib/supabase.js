import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Anon Key exists:', !!supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables', {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: !!supabaseAnonKey
  })
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Auth helper functions
export const authHelpers = {
  signUp: async (email, password, userData = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getCurrentUser: () => {
    return supabase.auth.getUser()
  },

  getSession: () => {
    return supabase.auth.getSession()
  }
}

// Database helper functions
export const dbHelpers = {
  // Profile functions
  getProfile: async (userId) => {
    try {
      console.log('🔄 Querying profile for user:', userId)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      console.log('📊 Profile query result:', { data, error })
      return { data, error }
    } catch (error) {
      console.error('❌ Profile query exception:', error)
      return { data: null, error }
    }
  },

  updateProfile: async (userId, updates) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  },

  searchUsers: async (query) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .or(`username.ilike.%${query}%, full_name.ilike.%${query}%`)
      .limit(10)
    return { data, error }
  },

  // Friend request functions
  sendFriendRequest: async (receiverId) => {
    try {
      console.log('🔄 Sending friend request to:', receiverId)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('❌ Not authenticated')
        return { data: null, error: new Error('Not authenticated') }
      }

      console.log('👤 Sender ID:', user.id)
      
      const { data, error } = await supabase
        .from('friend_requests')
        .insert([{ 
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        }])
        .select()
        .single()
      
      console.log('📤 Friend request result:', { data, error })
      return { data, error }
    } catch (error) {
      console.error('❌ Send friend request exception:', error)
      return { data: null, error }
    }
  },

  getFriendRequests: async (type = 'received') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }

    const column = type === 'received' ? 'receiver_id' : 'sender_id'
    const joinColumn = type === 'received' ? 'sender_id' : 'receiver_id'
    
    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        *,
        ${type === 'received' ? 'sender:sender_id' : 'receiver:receiver_id'}(id, username, full_name, avatar_url)
      `)
      .eq(column, user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  respondToFriendRequest: async (requestId, action) => {
    try {
      console.log('🔄 Responding to friend request:', requestId, action)
      
      if (action === 'accept') {
        // Step 1: Get the friend request details
        const { data: request, error: requestError } = await supabase
          .from('friend_requests')
          .select('*')
          .eq('id', requestId)
          .single()
        
        if (requestError) {
          console.error('❌ Failed to get friend request:', requestError)
          return { error: requestError }
        }
        
        console.log('📋 Friend request details:', request)
        
        // Step 2: Update friend request status to accepted
        const { error: updateError } = await supabase
          .from('friend_requests')
          .update({ status: 'accepted' })
          .eq('id', requestId)
        
        if (updateError) {
          console.error('❌ Failed to update friend request:', updateError)
          return { error: updateError }
        }
        
        // Step 3: Create friendship (ensure consistent ordering)
        const user1_id = request.sender_id < request.receiver_id ? request.sender_id : request.receiver_id
        const user2_id = request.sender_id < request.receiver_id ? request.receiver_id : request.sender_id
        
        const { data: friendship, error: friendshipError } = await supabase
          .from('friends')
          .insert([{
            user1_id: user1_id,
            user2_id: user2_id
          }])
          .select()
          .single()
        
        if (friendshipError) {
          console.error('❌ Failed to create friendship:', friendshipError)
          return { error: friendshipError }
        }
        
        console.log('✅ Friendship created:', friendship)
        return { data: friendship, error: null }
        
      } else {
        // Decline the request
        const { data, error } = await supabase
          .from('friend_requests')
          .update({ status: 'declined' })
          .eq('id', requestId)
          .select()
          .single()
        
        console.log('❌ Friend request declined:', data)
        return { data, error }
      }
    } catch (error) {
      console.error('❌ Exception responding to friend request:', error)
      return { data: null, error }
    }
  },

  // Friends functions
  getFriends: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }

    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        user1:user1_id(id, username, full_name, avatar_url),
        user2:user2_id(id, username, full_name, avatar_url)
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
    
    // Format the data to always show the friend (not the current user)
    const friends = data?.map(friendship => {
      const friend = friendship.user1_id === user.id ? friendship.user2 : friendship.user1
      return {
        ...friendship,
        friend
      }
    })
    
    return { data: friends, error }
  },

  // Room functions
  createRoom: async (roomData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }

    // Create room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert([{ ...roomData, owner_id: user.id }])
      .select()
      .single()

    if (roomError) return { data: null, error: roomError }

    // Add owner as a member
    const { error: memberError } = await supabase
      .from('room_members')
      .insert([{ room_id: room.id, user_id: user.id, role: 'owner' }])

    if (memberError) return { data: null, error: memberError }

    return { data: room, error: null }
  },

  getUserRooms: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { data: null, error: new Error('Not authenticated') }

      console.log('🔄 Fetching user rooms for:', user.id)
      
      // Simplified query without join to avoid 500 error
      const { data, error } = await supabase
        .from('room_members')
        .select('*')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
      
      console.log('📊 Room members query result:', { data, error })
      
      if (error) {
        console.error('❌ Room members query failed:', error)
        return { data: [], error: null } // Return empty array instead of failing
      }
      
      // If we have room memberships, get the room details separately
      if (data && data.length > 0) {
        const roomIds = data.map(membership => membership.room_id)
        const { data: rooms, error: roomsError } = await supabase
          .from('rooms')
          .select('*')
          .in('id', roomIds)
        
        if (roomsError) {
          console.error('❌ Rooms query failed:', roomsError)
          return { data: [], error: null }
        }
        
        // Combine membership data with room data
        const roomsWithRoles = data.map(membership => {
          const room = rooms.find(r => r.id === membership.room_id)
          return room ? { ...room, role: membership.role } : null
        }).filter(Boolean)
        
        return { data: roomsWithRoles, error: null }
      }
      
      return { data: [], error: null }
    } catch (error) {
      console.error('❌ getUserRooms exception:', error)
      return { data: [], error: null } // Don't break the app
    }
  },

  getRoomMembers: async (roomId) => {
    const { data, error } = await supabase
      .from('room_members')
      .select(`
        *,
        user:user_id(id, username, full_name, avatar_url)
      `)
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true })
    
    return { data, error }
  },

  addRoomMember: async (roomId, userId) => {
    const { data, error } = await supabase
      .from('room_members')
      .insert([{ room_id: roomId, user_id: userId }])
      .select()
      .single()
    return { data, error }
  },

  removeRoomMember: async (roomId, userId) => {
    const { error } = await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId)
    return { error }
  }
}