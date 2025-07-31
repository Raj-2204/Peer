import { useState, useEffect } from 'react'
import { dbHelpers } from '../lib/supabase'

function InviteToRoomModal({ friend, onClose, onInvite }) {
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState('')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    loadUserRooms()
  }, [])

  const loadUserRooms = async () => {
    setLoading(true)
    try {
      const { data, error } = await dbHelpers.getUserRooms()
      if (data) {
        // Only show rooms where user is owner or admin
        const ownedRooms = data.filter(room => 
          room.role === 'owner' || room.role === 'admin'
        )
        setRooms(ownedRooms)
      }
    } catch (error) {
      console.error('Error loading rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!selectedRoom) {
      alert('Please select a room first!')
      return
    }

    setInviting(true)
    try {
      console.log('🚀 Inviting friend to room:', { friendId: friend.id, roomId: selectedRoom })
      
      const { data, error } = await dbHelpers.addRoomMember(selectedRoom, friend.id)
      
      if (error) {
        console.error('❌ Invitation failed:', error)
        if (error.code === '23505') {
          alert('This friend is already a member of this room!')
        } else {
          alert(`Failed to invite friend: ${error.message}`)
        }
      } else {
        console.log('✅ Friend invited successfully:', data)
        alert(`Successfully invited ${friend.full_name} to the room!`)
        onInvite(selectedRoom, friend)
        onClose()
      }
    } catch (error) {
      console.error('❌ Exception inviting friend:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Invite {friend.full_name} to Room</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div>Loading your rooms...</div>
          ) : rooms.length === 0 ? (
            <div>
              <p>You don't have any rooms to invite friends to.</p>
              <p>Create a room first from your dashboard!</p>
            </div>
          ) : (
            <div>
              <label htmlFor="room-select">Select a room:</label>
              <select 
                id="room-select"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="room-select"
              >
                <option value="">Choose a room...</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.name} ({room.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          {rooms.length > 0 && (
            <button 
              onClick={handleInvite} 
              disabled={inviting || !selectedRoom}
              className="btn-primary"
            >
              {inviting ? 'Inviting...' : 'Send Invitation'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default InviteToRoomModal