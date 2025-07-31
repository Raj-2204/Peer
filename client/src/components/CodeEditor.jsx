import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { io } from 'socket.io-client'

function CodeEditor({ roomId, code, language, onCodeChange, onLanguageChange }) {
  const editorRef = useRef(null)
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const isUpdatingFromRemote = useRef(false)
  const [editorValue, setEditorValue] = useState(code || '// Welcome to collaborative coding!\nconsole.log("Hello World");')

  useEffect(() => {
    // Connect to Socket.IO server
    socketRef.current = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001')

    socketRef.current.on('connect', () => {
      console.log('Connected to server')
      setIsConnected(true)
      socketRef.current.emit('join-room', roomId)
    })

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server')
      setIsConnected(false)
    })

    // Listen for room state
    socketRef.current.on('room-state', (roomState) => {
      console.log('Received room state:', roomState)
      if (roomState.code && roomState.code !== editorValue) {
        isUpdatingFromRemote.current = true
        setEditorValue(roomState.code)
        onCodeChange(roomState.code)
        setTimeout(() => {
          isUpdatingFromRemote.current = false
        }, 100)
      }
      onLanguageChange(roomState.language)
    })

    // Listen for code changes from other users
    socketRef.current.on('code-change', (data) => {
      console.log('Received code change:', data)
      if (data.code !== editorValue && !isUpdatingFromRemote.current) {
        isUpdatingFromRemote.current = true
        setEditorValue(data.code)
        onCodeChange(data.code)
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
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [roomId, onCodeChange, onLanguageChange, editorValue])

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
    
    setEditorValue(value || '')
    onCodeChange(value || '')
    
    if (socketRef.current && isConnected) {
      console.log('Emitting code change via onChange:', (value || '').substring(0, 50) + '...')
      socketRef.current.emit('code-change', {
        roomId,
        code: value || '',
        language
      })
    }
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