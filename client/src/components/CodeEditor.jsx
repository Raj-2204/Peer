import { useEffect, useRef, useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { io } from 'socket.io-client'
import { useAuth } from '../contexts/AuthContext'
import { getUserColor } from '../utils/userColors'

function CodeEditor({ roomId, code, language, onCodeChange, onLanguageChange }) {
  const editorRef = useRef(null)
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const isUpdatingFromRemote = useRef(false)
  const [editorValue, setEditorValue] = useState(code || '// Welcome to collaborative coding!\nconsole.log("Hello World");')
  const debounceTimer = useRef(null)
  const lastSentValue = useRef('')
  const connectionRetryTimer = useRef(null)
  
  // Collaborative features
  const { profile, user } = useAuth()
  const [remoteCursors, setRemoteCursors] = useState({})
  const [userColor, setUserColor] = useState(null)
  const cursorTimer = useRef(null)
  const decorationsRef = useRef([])
  const highlightTimeouts = useRef(new Map())

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

  // Get user color on mount
  useEffect(() => {
    if (profile?.id || user?.id) {
      const color = getUserColor(roomId, profile?.id || user?.id)
      console.log('🎨 Assigned user color:', color, 'for user:', profile?.id || user?.id)
      setUserColor(color)
    }
  }, [roomId, profile?.id, user?.id])

  // Debounced cursor position sending
  const debouncedSendCursor = useCallback((position) => {
    if (cursorTimer.current) {
      clearTimeout(cursorTimer.current)
    }
    
    cursorTimer.current = setTimeout(() => {
      if (socketRef.current?.connected && position && userColor) {
        const cursorData = {
          roomId,
          userId: profile?.id || user?.id,
          userName: profile?.full_name || profile?.username || user?.email || 'Anonymous',
          position,
          color: userColor
        }
        console.log('🎯 Sending cursor:', cursorData)
        socketRef.current.emit('cursor-change', cursorData)
      }
    }, 100) // Send cursor updates every 100ms
  }, [roomId, profile, user, userColor])

  // Update remote cursor decorations
  const updateCursorDecorations = useCallback(() => {
    if (!editorRef.current || !editorRef.current.getModel()) return

    console.log('🎯 Updating cursor decorations for:', Object.keys(remoteCursors))

    const decorations = []
    
    Object.values(remoteCursors).forEach((cursor, index) => {
      if (cursor.position && cursor.color) {
        console.log('🎯 Adding cursor decoration for:', cursor.userName, 'at', cursor.position)
        
        // Create a visible range decoration for the cursor
        decorations.push({
          range: {
            startLineNumber: cursor.position.lineNumber,
            startColumn: cursor.position.column,
            endLineNumber: cursor.position.lineNumber,
            endColumn: cursor.position.column + 1 // Make it slightly wider to be visible
          },
          options: {
            className: 'remote-cursor-decoration',
            borderColor: cursor.color.primary,
            borderWidth: '2px',
            borderStyle: 'solid',
            backgroundColor: cursor.color.secondary,
            hoverMessage: { value: `${cursor.userName} is here` },
            afterContentClassName: 'remote-cursor-label',
            after: {
              content: cursor.userName,
              backgroundColor: cursor.color.primary,
              color: 'white'
            },
            overviewRuler: {
              color: cursor.color.primary,
              position: 4
            }
          }
        })

        // Also add a glyph margin indicator
        decorations.push({
          range: {
            startLineNumber: cursor.position.lineNumber,
            startColumn: 1,
            endLineNumber: cursor.position.lineNumber,
            endColumn: 1
          },
          options: {
            isWholeLine: false,
            glyphMarginClassName: 'remote-cursor-glyph',
            glyphMarginHoverMessage: { value: `${cursor.userName} is on this line` }
          }
        })
      }
    })

    console.log('🎯 Applying', decorations.length, 'decorations')
    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, decorations)
  }, [remoteCursors])

  // Add temporary edit highlight
  const addEditHighlight = useCallback((userId, startPos, endPos, color) => {
    if (!editorRef.current) return

    const decoration = {
      range: new editorRef.current.getModel().monaco.Range(
        startPos.lineNumber,
        startPos.column,
        endPos.lineNumber,
        endPos.column
      ),
      options: {
        className: 'recent-edit',
        backgroundColor: color.secondary,
        borderColor: color.primary,
        borderWidth: '1px',
        borderStyle: 'solid'
      }
    }

    const decorationIds = editorRef.current.deltaDecorations([], [decoration])

    // Clear previous highlight timeout for this user
    if (highlightTimeouts.current.has(userId)) {
      clearTimeout(highlightTimeouts.current.get(userId))
    }

    // Remove highlight after 2 seconds
    highlightTimeouts.current.set(userId, setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.deltaDecorations(decorationIds, [])
      }
      highlightTimeouts.current.delete(userId)
    }, 2000))
  }, [])

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

    // Listen for cursor changes from other users
    socketRef.current.on('cursor-change', (data) => {
      const { userId, userName, position, color } = data
      const currentUserId = profile?.id || user?.id
      
      console.log('🎯 Received cursor change:', { userId, userName, position, color })
      
      // Don't show our own cursor
      if (userId === currentUserId) return
      
      setRemoteCursors(prev => {
        const updated = {
          ...prev,
          [userId]: {
            userId,
            userName,
            position,
            color,
            lastUpdate: Date.now()
          }
        }
        console.log('🎯 Updated remote cursors:', updated)
        return updated
      })
    })

    // Listen for edit highlights from other users
    socketRef.current.on('edit-highlight', (data) => {
      const { userId, startPos, endPos, color } = data
      const currentUserId = profile?.id || user?.id
      
      // Don't highlight our own edits
      if (userId === currentUserId) return
      
      addEditHighlight(userId, startPos, endPos, color)
    })

    // Clean up old cursors every 5 seconds
    const cursorCleanup = setInterval(() => {
      const now = Date.now()
      setRemoteCursors(prev => {
        const filtered = {}
        Object.entries(prev).forEach(([userId, cursor]) => {
          // Keep cursor if updated within last 10 seconds
          if (now - cursor.lastUpdate < 10000) {
            filtered[userId] = cursor
          }
        })
        return filtered
      })
    }, 5000)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      if (connectionRetryTimer.current) {
        clearTimeout(connectionRetryTimer.current)
      }
      if (cursorTimer.current) {
        clearTimeout(cursorTimer.current)
      }
      if (cursorCleanup) {
        clearInterval(cursorCleanup)
      }
      // Clear all highlight timeouts
      highlightTimeouts.current.forEach(timeout => clearTimeout(timeout))
      highlightTimeouts.current.clear()
      
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [roomId])

  // Update cursor decorations when remote cursors change
  useEffect(() => {
    updateCursorDecorations()
  }, [remoteCursors, updateCursorDecorations])

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor
    console.log('Editor mounted successfully')

    // Focus the editor to make it ready for typing
    setTimeout(() => {
      editor.focus()
    }, 100)

    // Track cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      if (!isUpdatingFromRemote.current) {
        debouncedSendCursor({
          lineNumber: e.position.lineNumber,
          column: e.position.column
        })
      }
    })

    // Track content changes for edit highlights
    editor.onDidChangeModelContent((e) => {
      if (!isUpdatingFromRemote.current && userColor) {
        e.changes.forEach(change => {
          const startPos = {
            lineNumber: change.range.startLineNumber,
            column: change.range.startColumn
          }
          const endPos = {
            lineNumber: change.range.endLineNumber,
            column: change.range.endColumn
          }
          
          // Send edit highlight to other users
          if (socketRef.current?.connected) {
            socketRef.current.emit('edit-highlight', {
              roomId,
              userId: profile?.id || user?.id,
              startPos,
              endPos,
              color: userColor
            })
          }
        })
      }
    })
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
        
        <div className="collaborative-status">
          {userColor && (
            <div className="my-color-indicator">
              <span>Your color:</span>
              <div
                className="user-indicator"
                style={{ backgroundColor: userColor.primary }}
                title={`You are ${userColor.name}`}
              />
            </div>
          )}
          
          {Object.keys(remoteCursors).length > 0 && (
            <div className="active-users-section">
              <span>👥 Active ({Object.keys(remoteCursors).length}):</span>
              <div className="active-users">
                {Object.values(remoteCursors).map(cursor => (
                  <div
                    key={cursor.userId}
                    className="user-indicator"
                    style={{ backgroundColor: cursor.color?.primary || '#007acc' }}
                    title={`${cursor.userName} is typing`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
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