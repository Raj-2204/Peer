import { useState, useEffect, useRef } from 'react'
import Peer from 'peerjs'
import { useAuth } from '../contexts/AuthContext'
import { io } from 'socket.io-client'

function VoiceChat({ roomId }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [participants, setParticipants] = useState([])
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState(null)
  
  const { profile } = useAuth()
  const peerRef = useRef(null)
  const socketRef = useRef(null)
  const localStreamRef = useRef(null)
  const connectionsRef = useRef(new Map())
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    // Connect to Socket.IO for signaling
    socketRef.current = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001')
    
    socketRef.current.on('voice-user-joined', (data) => {
      console.log('User joined voice:', data)
      setParticipants(prev => {
        const existing = prev.find(p => p.peerId === data.peerId)
        if (existing) return prev
        return [...prev, data]
      })
    })

    socketRef.current.on('voice-user-left', (data) => {
      console.log('User left voice:', data)
      setParticipants(prev => prev.filter(p => p.peerId !== data.peerId))
      
      // Close connection if it exists
      const connection = connectionsRef.current.get(data.peerId)
      if (connection) {
        connection.close()
        connectionsRef.current.delete(data.peerId)
      }
    })

    socketRef.current.on('voice-participants', (participantsList) => {
      console.log('Voice participants update:', participantsList)
      setParticipants(participantsList)
    })

    return () => {
      cleanup()
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [roomId])

  const cleanup = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }

    // Close all peer connections
    connectionsRef.current.forEach(conn => conn.close())
    connectionsRef.current.clear()

    // Close peer
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }

  const tryFallbackPeerConnection = (peerId, stream) => {
    try {
      console.log('Trying fallback peer connection...')
      
      // Destroy existing peer first
      if (peerRef.current) {
        peerRef.current.destroy()
      }
      
      // Create new peer with no specific server (uses default)
      peerRef.current = new Peer(peerId + '-fallback', {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            }
          ]
        }
      })

      peerRef.current.on('open', (id) => {
        console.log('Fallback peer opened with ID:', id)
        setIsConnected(true)
        setError(null)
        
        // Join room via socket
        socketRef.current.emit('join-voice-room', {
          roomId,
          peerId: id,
          userName: profile?.full_name || profile?.username || 'Anonymous'
        })
      })

      peerRef.current.on('call', (call) => {
        console.log('Receiving fallback call from:', call.peer)
        call.answer(stream)
        
        call.on('stream', (remoteStream) => {
          console.log('Got fallback stream from:', call.peer)
          playRemoteStream(remoteStream, call.peer)
        })
        
        call.on('close', () => {
          console.log('Fallback call closed from:', call.peer)
          removeRemoteAudio(call.peer)
        })
        
        connectionsRef.current.set(call.peer, call)
      })

      peerRef.current.on('error', (err) => {
        console.error('Fallback peer error:', err)
        setError('Voice chat is currently unavailable')
        setIsConnected(false)
        setIsJoining(false)
      })

    } catch (err) {
      console.error('Fallback connection failed:', err)
      setError('Voice chat is currently unavailable')
      setIsConnected(false)
      setIsJoining(false)
    }
  }

  const detectSpeaking = (stream) => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      analyserRef.current.fftSize = 256
      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      const checkAudioLevel = () => {
        if (!analyserRef.current) return
        
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / bufferLength
        
        const speaking = average > 10 // Threshold for speaking detection
        setIsSpeaking(speaking)
        
        if (isConnected) {
          requestAnimationFrame(checkAudioLevel)
        }
      }
      
      checkAudioLevel()
    } catch (err) {
      console.warn('Could not set up audio analysis:', err)
    }
  }

  const joinVoiceChat = async () => {
    if (isJoining || isConnected) return
    
    setIsJoining(true)
    setError(null)
    
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      localStreamRef.current = stream
      detectSpeaking(stream)
      
      // Create peer with better production configuration
      const peerId = `peer-${roomId}-${profile?.id || 'anon'}-${Date.now()}`
      
      peerRef.current = new Peer(peerId, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            // Add TURN servers for better connectivity
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelayproject', 
              credential: 'openrelayproject'
            }
          ],
          iceCandidatePoolSize: 10
        },
        debug: 1 // Enable debug for production troubleshooting
      })

      peerRef.current.on('open', (id) => {
        console.log('Peer opened with ID:', id)
        setIsConnected(true)
        
        // Join room via socket
        socketRef.current.emit('join-voice-room', {
          roomId,
          peerId: id,
          userName: profile?.full_name || profile?.username || 'Anonymous'
        })
      })

      peerRef.current.on('call', (call) => {
        console.log('Receiving call from:', call.peer)
        call.answer(localStreamRef.current)
        
        call.on('stream', (remoteStream) => {
          console.log('Got remote stream from:', call.peer)
          playRemoteStream(remoteStream, call.peer)
        })
        
        call.on('close', () => {
          console.log('Call closed from:', call.peer)
          removeRemoteAudio(call.peer)
        })
        
        connectionsRef.current.set(call.peer, call)
      })

      peerRef.current.on('error', (err) => {
        console.error('Peer error:', err)
        
        if (err.type === 'network' || err.type === 'server-error') {
          setError('Connection failed - trying alternative server...')
          
          // Retry with fallback configuration after 3 seconds
          setTimeout(() => {
            tryFallbackPeerConnection(peerId, localStreamRef.current)
          }, 3000)
        } else {
          setError(`Voice chat error: ${err.message || 'Connection failed'}`)
          setIsConnected(false)
          setIsJoining(false)
        }
      })

      // Connect to existing participants
      socketRef.current.on('voice-participants', (participantsList) => {
        participantsList.forEach(participant => {
          if (participant.peerId !== peerId && !connectionsRef.current.has(participant.peerId)) {
            console.log('Calling existing participant:', participant.peerId)
            const call = peerRef.current.call(participant.peerId, localStreamRef.current)
            
            call.on('stream', (remoteStream) => {
              console.log('Got stream from existing participant:', participant.peerId)
              playRemoteStream(remoteStream, participant.peerId)
            })
            
            call.on('close', () => {
              console.log('Call closed with existing participant:', participant.peerId)
              removeRemoteAudio(participant.peerId)
            })
            
            connectionsRef.current.set(participant.peerId, call)
          }
        })
      })

    } catch (err) {
      console.error('Failed to join voice chat:', err)
      setError(err.message)
      setIsConnected(false)
    } finally {
      setIsJoining(false)
    }
  }

  const playRemoteStream = (stream, peerId) => {
    // Remove existing audio element if any
    removeRemoteAudio(peerId)
    
    // Create new audio element
    const audio = document.createElement('audio')
    audio.id = `remote-audio-${peerId}`
    audio.srcObject = stream
    audio.autoplay = true
    audio.playsInline = true
    document.body.appendChild(audio)
  }

  const removeRemoteAudio = (peerId) => {
    const audio = document.getElementById(`remote-audio-${peerId}`)
    if (audio) {
      audio.remove()
    }
  }

  const leaveVoiceChat = () => {
    setIsConnected(false)
    setIsSpeaking(false)
    
    // Notify server
    if (socketRef.current) {
      socketRef.current.emit('leave-voice-room', {
        roomId,
        peerId: peerRef.current?.id
      })
    }
    
    cleanup()
    setParticipants([])
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = isMuted
      })
      setIsMuted(!isMuted)
    }
  }

  if (error) {
    return (
      <div className="voice-chat-container">
        <div className="voice-chat-error">
          <span>Voice chat error: {error}</span>
          <button onClick={() => setError(null)} className="btn-secondary">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="voice-chat-container">
      <div className="voice-chat-controls">
        {!isConnected ? (
          <button 
            onClick={joinVoiceChat} 
            disabled={isJoining}
            className="btn-primary voice-join-btn"
            title="Join voice chat"
          >
            {isJoining ? '🔄 Joining...' : '🎤 Join Voice'}
          </button>
        ) : (
          <div className="voice-active-controls">
            <button 
              onClick={toggleMute}
              className={`voice-control-btn ${isMuted ? 'muted' : 'unmuted'} ${isSpeaking ? 'speaking' : ''}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>
            
            <div className="voice-participants">
              <span className="participant-count">
                👥 {participants.length + 1} in call
              </span>
            </div>
            
            <button 
              onClick={leaveVoiceChat}
              className="btn-danger voice-leave-btn"
              title="Leave voice chat"
            >
              📞 Leave
            </button>
          </div>
        )}
      </div>

      {participants.length > 0 && (
        <div className="voice-participants-list">
          <div className={`participant-indicator ${isSpeaking ? 'speaking' : ''}`}>
            <span className="participant-name">You</span>
            <span className="participant-status">
              {isMuted ? '🔇' : (isSpeaking ? '🔊' : '🎤')}
            </span>
          </div>
          {participants.map(participant => (
            <div key={participant.peerId} className="participant-indicator">
              <span className="participant-name">{participant.userName}</span>
              <span className="participant-status">🎤</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default VoiceChat