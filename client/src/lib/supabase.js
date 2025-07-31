import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
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
    const { data, error } = await supabase
      .from('friend_requests')
      .insert([{ receiver_id: receiverId }])
      .select()
      .single()
    return { data, error }
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
    if (action === 'accept') {
      const { error } = await supabase.rpc('accept_friend_request', {
        request_id: requestId
      })
      return { error }
    } else {
      const { data, error } = await supabase
        .from('friend_requests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .select()
        .single()
      return { data, error }
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: new Error('Not authenticated') }

    const { data, error } = await supabase
      .from('room_members')
      .select(`
        *,
        room:room_id(*)
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
    
    return { data: data?.map(membership => ({ ...membership.room, role: membership.role })), error }
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