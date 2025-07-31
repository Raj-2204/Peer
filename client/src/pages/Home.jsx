import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

function Home() {
  const navigate = useNavigate()

  const createRoom = () => {
    const roomId = uuidv4()
    navigate(`/room/${roomId}`)
  }

  return (
    <div className="home-container">
      <div className="home-content">
        <h1>Peer Programming</h1>
        <p>Real-time collaborative code editor for teams</p>
        <button 
          onClick={createRoom}
          className="create-room-btn"
        >
          Create Room
        </button>
      </div>
    </div>
  )
}

export default Home