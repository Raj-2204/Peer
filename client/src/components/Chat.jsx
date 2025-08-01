import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../contexts/AuthContext'

function Chat({ roomId }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const { profile, user } = useAuth()

  useEffect(() => {
    // Connect to Socket.IO for chat
    socketRef.current = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001')
    
    // Join room for chat
    socketRef.current.emit('join-chat-room', {
      roomId,
      userId: profile?.id || user?.id,
      userName: profile?.full_name || profile?.username || user?.email || 'Anonymous'
    })

    // Listen for new messages
    socketRef.current.on('new-message', (message) => {
      console.log('💬 New message:', message)
      setMessages(prev => [...prev, message])
    })

    // Listen for message history
    socketRef.current.on('chat-history', (history) => {
      console.log('💬 Chat history:', history.length, 'messages')
      setMessages(history)
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [roomId, profile?.id, user?.id])

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (e) => {
    e.preventDefault()
    
    if (!newMessage.trim()) return

    const messageData = {
      roomId,
      userId: profile?.id || user?.id,
      userName: profile?.full_name || profile?.username || user?.email || 'Anonymous',
      userAvatar: profile?.avatar_url || null,
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    }

    socketRef.current.emit('send-message', messageData)
    setNewMessage('')
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    
    return date.toLocaleDateString()
  }

  const isMyMessage = (message) => {
    const currentUserId = profile?.id || user?.id
    return message.userId === currentUserId
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h4>💬 Chat</h4>
        <div className="message-count">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <span>No messages yet</span>
            <span>Start the conversation! 👋</span>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${isMyMessage(message) ? 'my-message' : 'other-message'}`}
            >
              {!isMyMessage(message) && (
                <div className="message-avatar">
                  {message.userAvatar ? (
                    <img src={message.userAvatar} alt={message.userName} />
                  ) : (
                    <div className="avatar-placeholder">
                      {message.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
              
              <div className="message-content">
                {!isMyMessage(message) && (
                  <div className="message-header">
                    <span className="message-sender">{message.userName}</span>
                    <span className="message-time">{formatTime(message.timestamp)}</span>
                  </div>
                )}
                
                <div className="message-text">
                  {message.message}
                </div>
                
                {isMyMessage(message) && (
                  <div className="message-time my-message-time">
                    {formatTime(message.timestamp)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="message-input-form">
        <div className="input-container">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="message-input"
            maxLength={500}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="send-button"
            title="Send message"
          >
            📤
          </button>
        </div>
        <div className="input-info">
          <span className="char-count">
            {newMessage.length}/500
          </span>
          <span className="send-hint">
            Press Enter to send
          </span>
        </div>
      </form>
    </div>
  )
}

export default Chat