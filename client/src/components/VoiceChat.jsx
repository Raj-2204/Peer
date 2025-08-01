import { useState, useEffect, useRef } from 'react'
import Peer from 'peerjs'
import { useAuth } from '../contexts/AuthContext'
import { io } from 'socket.io-client'

function VoiceChat({ roomId }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [participants, setParticipants] = useState([])
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  
  const { profile, user } = useAuth()
  const peerRef = useRef(null)
  const socketRef = useRef(null)
  const localStreamRef = useRef(null)
  const localVideoRef = useRef(null)
  const connectionsRef = useRef(new Map())
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    // Connect to Socket.IO for signaling
    socketRef.current = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001')
    
    socketRef.current.on('voice-user-joined', (data) => {
      console.log('🔊 User joined voice:', data)
      setParticipants(prev => {
        const existing = prev.find(p => p.peerId === data.peerId)
        if (existing) {
          console.log('🔊 User already in participants list')
          return prev
        }
        console.log('🔊 Adding new participant:', data)
        
        // Handle new participant connection with proper signaling
        if (peerRef.current && peerRef.current.id) {
          const myPeerId = peerRef.current.id
          const shouldInitiate = myPeerId < data.peerId
          
          if (shouldInitiate && !connectionsRef.current.has(data.peerId)) {
            console.log('🔊 Initiating call to new participant:', data.peerId)
            setTimeout(() => {
              if (peerRef.current && localStreamRef.current && !connectionsRef.current.has(data.peerId)) {
                const call = peerRef.current.call(data.peerId, localStreamRef.current)
                
                call.on('stream', (remoteStream) => {
                  console.log('🔊 Got stream from new participant:', data.peerId)
                  playRemoteStream(remoteStream, data.peerId)
                })
                
                call.on('close', () => {
                  console.log('🔊 Call closed with new participant:', data.peerId)
                  removeRemoteMedia(data.peerId)
                  connectionsRef.current.delete(data.peerId)
                })
                
                call.on('error', (err) => {
                  console.error('🔊 Call error with new participant:', data.peerId, err)
                  connectionsRef.current.delete(data.peerId)
                })
                
                connectionsRef.current.set(data.peerId, call)
              }
            }, 500) // Reduced delay for faster connections
          } else {
            console.log('🔊 Waiting for call from new participant:', data.peerId)
          }
        }
        
        return [...prev, data]
      })
    })

    socketRef.current.on('voice-user-left', (data) => {
      console.log('🔊 User left voice:', data)
      setParticipants(prev => prev.filter(p => p.peerId !== data.peerId))
      
      // Close connection if it exists
      const connection = connectionsRef.current.get(data.peerId)
      if (connection) {
        connection.close()
        connectionsRef.current.delete(data.peerId)
      }
      
      // Remove their video/audio elements
      removeRemoteMedia(data.peerId)
    })

    socketRef.current.on('voice-participants', (participantsList) => {
      console.log('🔊 Voice participants update:', participantsList)
      console.log('🔊 Setting participants to:', participantsList.length, 'participants')
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

    // Clear local video
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }

    // Remove all remote video elements
    document.querySelectorAll('[id^="remote-video-"], [id^="remote-audio-"]').forEach(el => {
      el.remove()
    })

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
      
      // Create new peer with default configuration for fallback
      peerRef.current = new Peer(peerId + '-fallback', {
        // Use default PeerJS configuration (let it choose server)
        // Don't specify host to use PeerJS's default servers
        config: {
          iceServers: [
            // Use more STUN servers for fallback
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            // Multiple TURN servers
            {
              urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
              username: 'openrelayproject',
              credential: 'openrelayproject'
            },
            {
              urls: 'turn:relay.backups.cz:3478',
              username: 'webrtc',
              credential: 'webrtc'  
            }
          ],
          iceTransportPolicy: 'all'
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
          removeRemoteMedia(call.peer)
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
    
    // Wait for user/profile data to be available
    if (!user && !profile) {
      setError('Please wait for authentication to complete...')
      return
    }
    
    setIsJoining(true)
    setError(null)
    setConnectionStatus('connecting')
    
    try {
      // Get user media with optional video
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      }
      
      if (isVideoEnabled) {
        constraints.video = {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 30 }
        }
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      localStreamRef.current = stream
      detectSpeaking(stream)
      
      // Display local video if enabled
      if (isVideoEnabled && localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      
      // Create peer with simpler ID generation
      const userId = profile?.id || user?.id || Math.random().toString(36).substring(7)
      const userName = profile?.full_name || profile?.username || user?.email || 'Anonymous'
      const peerId = `${userId}-${Date.now()}`
      
      console.log('🔊 Creating peer with:', { userId, userName, peerId })
      
      peerRef.current = new Peer(peerId, {
        // Always use the free PeerJS cloud server
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        config: {
          iceServers: [
            // Multiple STUN servers for better connectivity
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            // TURN servers for NAT traversal
            {
              urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
              username: 'openrelayproject',
              credential: 'openrelayproject'
            },
            {
              urls: 'turn:relay.backups.cz:3478',
              username: 'webrtc',
              credential: 'webrtc'
            }
          ],
          iceCandidatePoolSize: 10,
          // Add additional WebRTC configuration for production
          iceTransportPolicy: 'all',
          bundlePolicy: 'balanced'
        },
        debug: 0 // Disable debug in production to reduce noise
      })

      peerRef.current.on('open', (id) => {
        console.log('Peer opened with ID:', id)
        setIsConnected(true)
        setConnectionStatus('connected')
        setError(null)
        
        // Join room via socket with more debug info
        console.log('🔊 Joining voice room:', { roomId, peerId: id, userName })
        socketRef.current.emit('join-voice-room', {
          roomId,
          peerId: id,
          userName: userName
        })
      })

      peerRef.current.on('call', (call) => {
        console.log('Receiving call from:', call.peer)
        
        // Check if we already have a connection with this peer
        if (connectionsRef.current.has(call.peer)) {
          console.log('Already connected to', call.peer, '- declining duplicate call')
          return
        }
        
        call.answer(localStreamRef.current)
        
        call.on('stream', (remoteStream) => {
          console.log('Got remote stream from:', call.peer)
          playRemoteStream(remoteStream, call.peer)
        })
        
        call.on('close', () => {
          console.log('Call closed from:', call.peer)
          removeRemoteMedia(call.peer)
          connectionsRef.current.delete(call.peer)
        })
        
        call.on('error', (err) => {
          console.error('Incoming call error from:', call.peer, err)
          connectionsRef.current.delete(call.peer)
          removeRemoteMedia(call.peer)
        })
        
        connectionsRef.current.set(call.peer, call)
      })

      peerRef.current.on('error', (err) => {
        console.error('Peer error:', err)
        
        // Handle specific WebRTC errors
        if (err.message && err.message.includes('InvalidStateError')) {
          console.log('WebRTC state error - cleaning up connections...')
          
          // Clean up existing connections
          connectionsRef.current.forEach((conn, peerId) => {
            try {
              conn.close()
            } catch (e) {
              console.warn('Error closing connection:', e)
            }
          })
          connectionsRef.current.clear()
          
          setError('Connection state error - please try rejoining')
          setIsConnected(false)
          setIsJoining(false)
          
        } else if (err.type === 'network' || err.type === 'server-error' || err.message?.includes('Lost connection to server')) {
          console.log('PeerJS server connection failed, retrying...')
          setError('Connection failed - retrying...')
          
          // Simple retry without complex fallback
          setTimeout(() => {
            setError(null)
            setIsJoining(false)
            setIsConnected(false)
          }, 3000)
        } else {
          setError(`Voice chat error: ${err.message || 'Connection failed'}`)
          setIsConnected(false)
          setIsJoining(false)
        }
      })

      // Connect to existing participants with proper signaling order
      socketRef.current.on('voice-participants', (participantsList) => {
        participantsList.forEach(participant => {
          if (participant.peerId !== peerId && !connectionsRef.current.has(participant.peerId)) {
            // Only initiate call if our peerId is lexicographically smaller to avoid race conditions
            const shouldInitiate = peerId < participant.peerId
            
            if (shouldInitiate) {
              console.log('Initiating call to existing participant:', participant.peerId)
              setTimeout(() => {
                if (peerRef.current && !connectionsRef.current.has(participant.peerId)) {
                  const call = peerRef.current.call(participant.peerId, localStreamRef.current)
                  
                  call.on('stream', (remoteStream) => {
                    console.log('Got stream from existing participant:', participant.peerId)
                    playRemoteStream(remoteStream, participant.peerId)
                  })
                  
                  call.on('close', () => {
                    console.log('Call closed with existing participant:', participant.peerId)
                    removeRemoteMedia(participant.peerId)
                    connectionsRef.current.delete(participant.peerId)
                  })
                  
                  call.on('error', (err) => {
                    console.error('Call error with participant:', participant.peerId, err)
                    connectionsRef.current.delete(participant.peerId)
                  })
                  
                  connectionsRef.current.set(participant.peerId, call)
                }
              }, 500) // Reduced delay for faster connections
            } else {
              console.log('Waiting for call from existing participant:', participant.peerId)
            }
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
    // Remove existing elements if any
    removeRemoteMedia(peerId)
    
    const hasVideo = stream.getVideoTracks().length > 0
    
    if (hasVideo) {
      // Create video element for video streams
      const video = document.createElement('video')
      video.id = `remote-video-${peerId}`
      video.srcObject = stream
      video.autoplay = true
      video.playsInline = true
      video.muted = false // We want to hear the audio
      video.style.cssText = `
        width: 200px;
        height: 150px;
        border-radius: 8px;
        object-fit: cover;
        border: 2px solid #4CAF50;
        margin: 4px;
      `
      
      // Add to video container
      const videoContainer = document.getElementById('remote-videos-container') || 
                            createVideoContainer()
      videoContainer.appendChild(video)
    } else {
      // Create audio element for audio-only streams
      const audio = document.createElement('audio')
      audio.id = `remote-audio-${peerId}`
      audio.srcObject = stream
      audio.autoplay = true
      audio.playsInline = true
      document.body.appendChild(audio)
    }
  }

  const createVideoContainer = () => {
    let container = document.getElementById('remote-videos-container')
    if (!container) {
      container = document.createElement('div')
      container.id = 'remote-videos-container'
      container.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        display: flex;
        flex-wrap: wrap;
        max-width: 400px;
        z-index: 1000;
        background: rgba(0,0,0,0.1);
        border-radius: 12px;
        padding: 8px;
      `
      document.body.appendChild(container)
    }
    return container
  }

  const removeRemoteMedia = (peerId) => {
    const video = document.getElementById(`remote-video-${peerId}`)
    const audio = document.getElementById(`remote-audio-${peerId}`)
    
    if (video) video.remove()
    if (audio) audio.remove()
    
    // Clean up empty container
    const container = document.getElementById('remote-videos-container')
    if (container && container.children.length === 0) {
      container.remove()
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

  const toggleVideo = async () => {
    if (!isConnected) return

    try {
      if (isVideoEnabled) {
        // Turn off video
        const videoTracks = localStreamRef.current?.getVideoTracks() || []
        videoTracks.forEach(track => track.stop())
        
        // Clear local video display
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null
        }
        
        // Get new audio-only stream
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        
        localStreamRef.current = audioStream
        setIsVideoEnabled(false)
        
      } else {
        // Turn on video
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            frameRate: { min: 15, ideal: 30, max: 30 }
          }
        }
        
        const videoStream = await navigator.mediaDevices.getUserMedia(constraints)
        
        // Stop old stream
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop())
        }
        
        localStreamRef.current = videoStream
        setIsVideoEnabled(true)
        
        // Display local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = videoStream
        }
      }
      
      // Update all peer connections with new stream
      connectionsRef.current.forEach(async (connection, peerId) => {
        try {
          // Close old connection
          connection.close()
          
          // Create new call with updated stream
          const newCall = peerRef.current.call(peerId, localStreamRef.current)
          
          newCall.on('stream', (remoteStream) => {
            console.log('Updated stream from:', peerId)
            playRemoteStream(remoteStream, peerId)
          })
          
          newCall.on('close', () => {
            removeRemoteMedia(peerId)
            connectionsRef.current.delete(peerId)
          })
          
          newCall.on('error', (err) => {
            console.error('Updated call error:', err)
            connectionsRef.current.delete(peerId)
          })
          
          connectionsRef.current.set(peerId, newCall)
        } catch (err) {
          console.error('Failed to update connection:', err)
        }
      })
      
    } catch (err) {
      console.error('Failed to toggle video:', err)
      setError('Failed to toggle video: ' + err.message)
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
      {/* Local video display */}
      {isVideoEnabled && (
        <div className="local-video-container" style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 1000,
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '200px',
              height: '150px',
              objectFit: 'cover',
              border: '2px solid #2196F3'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            You {isMuted ? '🔇' : (isSpeaking ? '🔊' : '🎤')}
          </div>
        </div>
      )}

      <div className="voice-chat-controls">
        {!isConnected ? (
          <div className="join-controls">
            <label className="video-option">
              <input
                type="checkbox"
                checked={isVideoEnabled}
                onChange={(e) => setIsVideoEnabled(e.target.checked)}
                disabled={isJoining}
              />
              📹 Join with video
            </label>
            <button 
              onClick={joinVoiceChat} 
              disabled={isJoining}
              className="btn-primary voice-join-btn"
              title={isVideoEnabled ? "Join video call" : "Join voice chat"}
            >
              {isJoining ? '🔄 Joining...' : (isVideoEnabled ? '📹 Join Video' : '🎤 Join Voice')}
            </button>
          </div>
        ) : (
          <div className="voice-active-controls">
            <button 
              onClick={toggleMute}
              className={`voice-control-btn ${isMuted ? 'muted' : 'unmuted'} ${isSpeaking ? 'speaking' : ''}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>

            <button 
              onClick={toggleVideo}
              className={`voice-control-btn ${isVideoEnabled ? 'video-on' : 'video-off'}`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? '📹' : '📷'}
            </button>
            
            <div className="voice-participants">
              <span className="participant-count">
                👥 {participants.length + 1} in call
              </span>
              <span className="connection-status" style={{
                fontSize: '0.8rem',
                color: connectionStatus === 'connected' ? '#28a745' : 
                       connectionStatus === 'connecting' ? '#ffc107' : '#dc3545',
                marginLeft: '8px'
              }}>
                {connectionStatus === 'connected' ? '🟢' : 
                 connectionStatus === 'connecting' ? '🟡' : '🔴'}
              </span>
            </div>
            
            <button 
              onClick={leaveVoiceChat}
              className="btn-danger voice-leave-btn"
              title="Leave call"
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