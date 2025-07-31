import { useEffect, useRef, useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { io } from 'socket.io-client'

function CodeEditor({ roomId, code, language, onCodeChange, onLanguageChange }) {
  const editorRef = useRef(null)
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const isUpdatingFromRemote = useRef(false)
  const [editorValue, setEditorValue] = useState(code || '// Welcome to collaborative coding!\nconsole.log("Hello World");')
  const debounceTimer = useRef(null)
  const lastSentValue = useRef('')
  const connectionRetryTimer = useRef(null)

  // Debounced function to send code changes
  const debouncedSendCode = useCallback((value) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    debounceTimer.current = setTimeout(() => {
      if (socketRef.current?.connected && value !== lastSentValue.current) {
        console.log('Sending debounced code change:', value.substring(0, 50) + '...')
        socketRef.current.emit('code-change', {
          roomId,
          code: value,
          language
        })
        lastSentValue.current = value
      }
    }, 200) // Reduced to 200ms for better responsiveness
  }, [roomId, language])

  useEffect(() => {
    // Connect to Socket.IO server with better options
    socketRef.current = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    })

    socketRef.current.on('connect', () => {
      console.log('Connected to server')
      setIsConnected(true)
      socketRef.current.emit('join-room', roomId)
      
      // Clear retry timer on successful connection
      if (connectionRetryTimer.current) {
        clearTimeout(connectionRetryTimer.current)
      }
    })

    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason)
      // Only show disconnected for actual disconnections, not brief hiccups
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        setIsConnected(false)
      } else {
        // For network issues, wait a bit before showing disconnected
        connectionRetryTimer.current = setTimeout(() => {
          if (!socketRef.current?.connected) {
            setIsConnected(false)
          }
        }, 1000)
      }
    })

    socketRef.current.on('reconnect', () => {
      console.log('Reconnected to server')
      setIsConnected(true)
      socketRef.current.emit('join-room', roomId)
    })

    // Listen for room state
    socketRef.current.on('room-state', (roomState) => {
      console.log('Received room state:', roomState)
      if (roomState.code && roomState.code !== editorValue) {
        isUpdatingFromRemote.current = true
        setEditorValue(roomState.code)
        onCodeChange(roomState.code)
        lastSentValue.current = roomState.code
        setTimeout(() => {
          isUpdatingFromRemote.current = false
        }, 100)
      }
      if (roomState.language) {
        onLanguageChange(roomState.language)
      }
    })

    // Listen for code changes from other users
    socketRef.current.on('code-change', (data) => {
      console.log('Received code change from remote:', data.code.substring(0, 50) + '...')
      if (data.code !== editorValue && !isUpdatingFromRemote.current) {
        isUpdatingFromRemote.current = true
        setEditorValue(data.code)
        onCodeChange(data.code)
        lastSentValue.current = data.code
        setTimeout(() => {
          isUpdatingFromRemote.current = false
        }, 100)
      }
    })

    // Listen for language changes
    socketRef.current.on('language-change', (data) => {
      console.log('Received language change:', data)
      onLanguageChange(data.language)
    })

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      if (connectionRetryTimer.current) {
        clearTimeout(connectionRetryTimer.current)
      }
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [roomId])

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor
    console.log('Editor mounted successfully')

    // Focus the editor to make it ready for typing
    setTimeout(() => {
      editor.focus()
    }, 100)
  }

  const handleEditorChange = (value) => {
    if (isUpdatingFromRemote.current) {
      return
    }
    
    const newValue = value || ''
    setEditorValue(newValue)
    onCodeChange(newValue)
    
    // Use debounced sending to prevent overwhelming the server
    debouncedSendCode(newValue)
  }

  return (
    <div className="code-editor">
      <div className="connection-status">
        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>
      <Editor
        height="400px"
        language={language}
        theme="vs-dark"
        value={editorValue}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
          readOnly: false,
          domReadOnly: false,
        }}
      />
    </div>
  )
}

export default CodeEditor