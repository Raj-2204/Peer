import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { dbHelpers } from '../lib/supabase'

function Dashboard() {
  const [rooms, setRooms] = useState([])
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('rooms')
  const [newRoomName, setNewRoomName] = useState('')
  const [showCreateRoom, setShowCreateRoom] = useState(false)

  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [roomsData, friendsData, requestsData] = await Promise.all([
        dbHelpers.getUserRooms(),
        dbHelpers.getFriends(),
        dbHelpers.getFriendRequests('received')
      ])

      if (roomsData.data) setRooms(roomsData.data)
      if (friendsData.data) setFriends(friendsData.data)
      if (requestsData.data) setFriendRequests(requestsData.data)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    if (!newRoomName.trim()) return

    const { data, error } = await dbHelpers.createRoom({
      name: newRoomName,
      description: `${profile?.username || 'User'}'s coding room`
    })

    if (error) {
      console.error('Error creating room:', error)
    } else {
      setRooms([data, ...rooms])
      setNewRoomName('')
      setShowCreateRoom(false)
    }
  }

  const handleJoinRoom = (roomId) => {
    navigate(`/room/${roomId}`)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleAcceptFriendRequest = async (requestId) => {
    const { error } = await dbHelpers.respondToFriendRequest(requestId, 'accept')
    if (!error) {
      loadDashboardData() // Reload to update lists
    }
  }

  const handleDeclineFriendRequest = async (requestId) => {
    const { error } = await dbHelpers.respondToFriendRequest(requestId, 'decline')
    if (!error) {
      setFriendRequests(friendRequests.filter(req => req.id !== requestId))
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Welcome back, {profile?.username || 'User'}!</h1>
          <div className="header-actions">
            <button onClick={() => navigate('/friends')} className="btn-secondary">
              Manage Friends
            </button>
            <button onClick={handleSignOut} className="btn-secondary">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-tabs">
          <button 
            className={`tab ${activeTab === 'rooms' ? 'active' : ''}`}
            onClick={() => setActiveTab('rooms')}
          >
            My Rooms ({rooms.length})
          </button>
          <button 
            className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Friend Requests ({friendRequests.length})
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'rooms' && (
            <div className="rooms-section">
              <div className="section-header">
                <h2>Your Coding Rooms</h2>
                <button 
                  onClick={() => setShowCreateRoom(true)}
                  className="btn-primary"
                >
                  + Create Room
                </button>
              </div>

              {showCreateRoom && (
                <div className="create-room-form">
                  <form onSubmit={handleCreateRoom}>
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="Enter room name"
                      required
                    />
                    <div className="form-actions">
                      <button type="submit" className="btn-primary">Create</button>
                      <button 
                        type="button" 
                        onClick={() => setShowCreateRoom(false)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="rooms-grid">
                {rooms.length === 0 ? (
                  <div className="empty-state">
                    <p>No rooms yet. Create your first coding room!</p>
                  </div>
                ) : (
                  rooms.map(room => (
                    <div key={room.id} className="room-card">
                      <h3>{room.name}</h3>
                      <p>{room.description}</p>
                      <div className="room-meta">
                        <span className="room-role">{room.role}</span>
                        <span className="room-date">
                          Created {new Date(room.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleJoinRoom(room.id)}
                        className="btn-primary"
                      >
                        Join Room
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="requests-section">
              <h2>Friend Requests</h2>
              
              {friendRequests.length === 0 ? (
                <div className="empty-state">
                  <p>No pending friend requests</p>
                </div>
              ) : (
                <div className="requests-list">
                  {friendRequests.map(request => (
                    <div key={request.id} className="request-card">
                      <div className="request-info">
                        <img 
                          src={request.sender.avatar_url || '/default-avatar.png'} 
                          alt={request.sender.username}
                          className="avatar-small"
                        />
                        <div>
                          <h4>{request.sender.full_name}</h4>
                          <p>@{request.sender.username}</p>
                        </div>
                      </div>
                      <div className="request-actions">
                        <button 
                          onClick={() => handleAcceptFriendRequest(request.id)}
                          className="btn-success"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => handleDeclineFriendRequest(request.id)}
                          className="btn-danger"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard