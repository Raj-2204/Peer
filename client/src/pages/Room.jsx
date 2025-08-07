import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import CodeEditor from '../components/CodeEditor'
import VoiceChat from '../components/VoiceChat'
import MembersSidebar from '../components/MembersSidebar'
import CollaborativeDiagram from '../components/CollaborativeDiagram'

function Room() {
  const { id: roomId } = useParams()
  const [code, setCode] = useState('// Welcome to collaborative coding!\nconsole.log("Hello World");')
  const [language, setLanguage] = useState('javascript')
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [currentView, setCurrentView] = useState('code') // 'code' or 'diagram'
  const socketRef = useRef(null)

  useEffect(() => {
    // Connect to Socket.IO server for language changes
    socketRef.current = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001')
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [roomId])

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' }
  ]

  const handleCodeChange = (newCode) => {
    setCode(newCode)
  }

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage)
  }

  const runCode = async () => {
    setIsRunning(true)
    setOutput('Running...')

    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        setOutput(result.output || 'No output')
      } else {
        setOutput(`Error: ${result.message || 'Code execution failed'}`)
      }
    } catch (error) {
      setOutput(`Error: ${error.message}`)
    } finally {
      setIsRunning(false)
    }
  }

  const copyRoomUrl = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('Room URL copied to clipboard!')
  }

  return (
    <div className="room-container">
      {/* Members Sidebar */}
      <MembersSidebar roomId={roomId} />

      <div className="room-header">
        <h1>Room: {roomId}</h1>
        <button onClick={copyRoomUrl} className="copy-url-btn">
          Copy Room URL
        </button>
      </div>

      {/* Voice Chat */}
      <VoiceChat roomId={roomId} />

      {/* View Toggle */}
      <div className="view-toggle">
        <button 
          className={`view-btn ${currentView === 'code' ? 'active' : ''}`}
          onClick={() => setCurrentView('code')}
        >
          💻 Code Editor
        </button>
        <button 
          className={`view-btn ${currentView === 'diagram' ? 'active' : ''}`}
          onClick={() => setCurrentView('diagram')}
        >
          📊 Diagram
        </button>
      </div>

      {currentView === 'code' && (
        <div className="editor-controls">
          <select 
            value={language} 
            onChange={(e) => {
              const newLang = e.target.value
              setLanguage(newLang)
              // Emit language change to other users via socket
              if (socketRef.current) {
                socketRef.current.emit('language-change', {
                  roomId,
                  language: newLang
                })
              }
            }}
            className="language-select"
          >
            {languages.map(lang => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>

          <button 
            onClick={runCode} 
            disabled={isRunning}
            className="run-btn"
          >
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
      )}

      {/* Code Editor View */}
      {currentView === 'code' && (
        <>
          <CodeEditor
            roomId={roomId}
            code={code}
            language={language}
            onCodeChange={handleCodeChange}
            onLanguageChange={handleLanguageChange}
          />

          <div className="output-section">
            <h3>Output:</h3>
            <pre className="output">{output}</pre>
          </div>
        </>
      )}

      {/* Diagram View */}
      {currentView === 'diagram' && (
        <CollaborativeDiagram 
          roomId={roomId} 
          socket={socketRef.current} 
          isVisible={currentView === 'diagram'}
        />
      )}
    </div>
  )
}

export default Room