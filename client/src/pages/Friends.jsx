import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { dbHelpers } from '../lib/supabase'
import InviteToRoomModal from '../components/InviteToRoomModal'

function Friends() {
  const [friends, setFriends] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [activeTab, setActiveTab] = useState('friends')
  const [sentRequests, setSentRequests] = useState([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState(null)

  const { user, profile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      loadFriendsData()
    }
  }, [user])

  const loadFriendsData = async () => {
    setLoading(true)
    try {
      const [friendsData, sentRequestsData] = await Promise.all([
        dbHelpers.getFriends(),
        dbHelpers.getFriendRequests('sent')
      ])

      if (friendsData.data) setFriends(friendsData.data)
      if (sentRequestsData.data) setSentRequests(sentRequestsData.data)
    } catch (error) {
      console.error('Error loading friends data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query) => {
    setSearchQuery(query)
    
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const { data, error } = await dbHelpers.searchUsers(query)
      if (data) {
        // Filter out current user and existing friends
        const filteredResults = data.filter(user => 
          user.id !== profile?.id && 
          !friends.some(friend => friend.friend.id === user.id) &&
          !sentRequests.some(request => request.receiver.id === user.id)
        )
        setSearchResults(filteredResults)
      }
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleSendFriendRequest = async (userId) => {
    try {
      console.log('🚀 Attempting to send friend request to:', userId)
      const { data, error } = await dbHelpers.sendFriendRequest(userId)
      
      if (error) {
        console.error('❌ Friend request failed:', error)
        
        // Show user-friendly error messages
        if (error.code === '23505') {
          alert('Friend request already sent to this user!')
        } else if (error.message.includes('foreign key')) {
          alert('User not found!')
        } else {
          alert(`Failed to send friend request: ${error.message}`)
        }
      } else {
        console.log('✅ Friend request sent successfully:', data)
        alert('Friend request sent successfully!')
        
        // Remove from search results and add to sent requests
        setSearchResults(searchResults.filter(user => user.id !== userId))
        loadFriendsData() // Reload to get updated sent requests
      }
    } catch (error) {
      console.error('❌ Exception sending friend request:', error)
      alert(`Error: ${error.message}`)
    }
  }

  const handleRemoveFriend = async (friendshipId) => {
    // Note: You'd need to implement a remove friend function in dbHelpers
    console.log('Remove friend functionality to be implemented')
  }

  const handleInviteToRoom = (friend) => {
    console.log('🚀 Opening invite modal for friend:', friend)
    setSelectedFriend(friend)
    setShowInviteModal(true)
  }

  const handleInviteSuccess = (roomId, friend) => {
    console.log('✅ Successfully invited friend to room:', { roomId, friend })
    // Optionally refresh data or show success message
  }

  if (loading) {
    return (
      <div className="friends-container">
        <div className="loading">Loading friends...</div>
      </div>
    )
  }

  return (
    <div className="friends-container">
      <header className="friends-header">
        <div className="header-content">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Back to Dashboard
          </button>
          <h1>Friends & Connections</h1>
        </div>
      </header>

      <div className="friends-content">
        <div className="friends-tabs">
          <button 
            className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            My Friends ({friends.length})
          </button>
          <button 
            className={`tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Find Friends
          </button>
          <button 
            className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            Sent Requests ({sentRequests.length})
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'friends' && (
            <div className="friends-section">
              <h2>Your Friends</h2>
              
              {friends.length === 0 ? (
                <div className="empty-state">
                  <p>No friends yet. Start by searching for people to connect with!</p>
                </div>
              ) : (
                <div className="friends-grid">
                  {friends.map(friendship => (
                    <div key={friendship.id} className="friend-card">
                      <img 
                        src={friendship.friend.avatar_url || '/default-avatar.png'} 
                        alt={friendship.friend.username}
                        className="avatar"
                      />
                      <div className="friend-info">
                        <h3>{friendship.friend.full_name}</h3>
                        <p>@{friendship.friend.username}</p>
                        <span className="friend-since">
                          Friends since {new Date(friendship.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="friend-actions">
                        <button className="btn-primary">Message</button>
                        <button 
                          onClick={() => handleInviteToRoom(friendship.friend)}
                          className="btn-secondary"
                        >
                          Invite to Room
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="search-section">
              <h2>Find New Friends</h2>
              
              <div className="search-bar">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by username or name..."
                  className="search-input"
                />
                {searching && <div className="search-spinner">Searching...</div>}
              </div>

              {searchResults.length > 0 && (
                <div className="search-results">
                  <h3>Search Results</h3>
                  <div className="users-grid">
                    {searchResults.map(user => (
                      <div key={user.id} className="user-card">
                        <img 
                          src={user.avatar_url || '/default-avatar.png'} 
                          alt={user.username}
                          className="avatar"
                        />
                        <div className="user-info">
                          <h3>{user.full_name}</h3>
                          <p>@{user.username}</p>
                        </div>
                        <button 
                          onClick={() => handleSendFriendRequest(user.id)}
                          className="btn-primary"
                        >
                          Send Friend Request
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                <div className="no-results">
                  <p>No users found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sent' && (
            <div className="sent-requests-section">
              <h2>Sent Friend Requests</h2>
              
              {sentRequests.length === 0 ? (
                <div className="empty-state">
                  <p>No pending sent requests</p>
                </div>
              ) : (
                <div className="requests-list">
                  {sentRequests.map(request => (
                    <div key={request.id} className="request-card">
                      <div className="request-info">
                        <img 
                          src={request.receiver.avatar_url || '/default-avatar.png'} 
                          alt={request.receiver.username}
                          className="avatar-small"
                        />
                        <div>
                          <h4>{request.receiver.full_name}</h4>
                          <p>@{request.receiver.username}</p>
                          <span className="request-date">
                            Sent {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="request-status">
                        <span className="status-pending">Pending</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite to Room Modal */}
      {showInviteModal && selectedFriend && (
        <InviteToRoomModal
          friend={selectedFriend}
          onClose={() => {
            setShowInviteModal(false)
            setSelectedFriend(null)
          }}
          onInvite={handleInviteSuccess}
        />
      )}
    </div>
  )
}

export default Friends