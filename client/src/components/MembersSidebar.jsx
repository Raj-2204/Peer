import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../contexts/AuthContext'
import Chat from './Chat'

function MembersSidebar({ roomId }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('members') // 'members' or 'chat'
  const [activeMembers, setActiveMembers] = useState([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const socketRef = useRef(null)
  const { profile, user } = useAuth()

  useEffect(() => {
    // Connect to Socket.IO for member presence
    socketRef.current = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001')
    
    // Join room for member tracking
    socketRef.current.emit('join-room-member', {
      roomId,
      userId: profile?.id || user?.id,
      userName: profile?.full_name || profile?.username || user?.email || 'Anonymous',
      userAvatar: profile?.avatar_url || null
    })

    // Listen for member updates
    socketRef.current.on('room-members-update', (members) => {
      console.log('👥 Room members update:', members)
      setActiveMembers(members)
    })

    socketRef.current.on('member-joined', (member) => {
      console.log('👤 Member joined:', member)
      setActiveMembers(prev => {
        const existing = prev.find(m => m.userId === member.userId)
        if (existing) return prev
        return [...prev, member]
      })
    })

    socketRef.current.on('member-left', (member) => {
      console.log('👤 Member left:', member)
      setActiveMembers(prev => prev.filter(m => m.userId !== member.userId))
    })

    // Listen for new chat messages to show unread indicator
    socketRef.current.on('new-message', (message) => {
      // Only increment if not on chat tab and message is not from current user
      const currentUserId = profile?.id || user?.id
      if (activeTab !== 'chat' && message.userId !== currentUserId) {
        setUnreadMessages(prev => prev + 1)
      }
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-room-member', {
          roomId,
          userId: profile?.id || user?.id
        })
        socketRef.current.disconnect()
      }
    }
  }, [roomId, profile?.id, user?.id])

  const currentUserId = profile?.id || user?.id

  return (
    <>
      {/* Sidebar Toggle Button */}
      <button
        className={`sidebar-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle Members"
      >
        <div className="hamburger">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {/* Sidebar Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}

      {/* Members Sidebar */}
      <div className={`members-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-tabs">
            <button 
              className={`tab-button ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              👥 Members
            </button>
            <button 
              className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('chat')
                setUnreadMessages(0)
              }}
            >
              💬 Chat
              {unreadMessages > 0 && activeTab !== 'chat' && (
                <span className="unread-badge">{unreadMessages > 9 ? '9+' : unreadMessages}</span>
              )}
            </button>
          </div>
          <button 
            className="close-sidebar"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="sidebar-content">
          {activeTab === 'members' ? (
            <div className="members-list">
              <div className="members-section">
                <div className="section-title">
                  <span className="online-indicator">🟢</span>
                  Online ({activeMembers.length})
                </div>
                
                {activeMembers.length === 0 ? (
                  <div className="no-members">
                    <span>No other members online</span>
                  </div>
                ) : (
                  activeMembers.map(member => (
                    <div 
                      key={member.userId} 
                      className={`member-item ${member.userId === currentUserId ? 'current-user' : ''}`}
                    >
                      <div className="member-avatar">
                        {member.userAvatar ? (
                          <img src={member.userAvatar} alt={member.userName} />
                        ) : (
                          <div className="avatar-placeholder">
                            {member.userName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      <div className="member-info">
                        <div className="member-name">
                          {member.userName}
                          {member.userId === currentUserId && (
                            <span className="you-label">(You)</span>
                          )}
                        </div>
                        <div className="member-status">
                          <span className="status-indicator online">🟢</span>
                          <span className="status-text">Active now</span>
                        </div>
                      </div>

                      <div className="member-actions">
                        {member.userId !== currentUserId && (
                          <button 
                            className="member-action-btn"
                            title="Send message"
                            onClick={() => setActiveTab('chat')}
                          >
                            💬
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Future: Offline members section */}
              <div className="members-section offline-section">
                <div className="section-title">
                  <span className="offline-indicator">⚫</span>
                  Recently Active (0)
                </div>
                <div className="no-members">
                  <span>No recent activity</span>
                </div>
              </div>
            </div>
          ) : (
            <Chat roomId={roomId} />
          )}
        </div>

        <div className="sidebar-footer">
          <div className="room-info">
            <div className="room-id">Room: {roomId}</div>
            <div className="room-stats">
              {activeMembers.length} active member{activeMembers.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default MembersSidebar