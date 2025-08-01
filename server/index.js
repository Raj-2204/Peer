const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = createServer(app);
// Allow multiple origins for CORS
const allowedOrigins = [
  "http://localhost:5173",
  "https://peer-kohl.vercel.app",
  "https://peer-ashen.vercel.app", 
  process.env.CLIENT_URL
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Store active rooms and their documents
const rooms = new Map();

// Store voice chat participants by room
const voiceRooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        code: '// Welcome to collaborative coding!\nconsole.log("Hello World");',
        language: 'javascript'
      });
    }
    
    // Send current room state to the joining user
    socket.emit('room-state', rooms.get(roomId));
  });

  // Handle code changes
  socket.on('code-change', (data) => {
    const { roomId, code, language } = data;
    
    // Update room state
    if (rooms.has(roomId)) {
      rooms.set(roomId, { code, language: language || rooms.get(roomId).language });
    }
    
    // Broadcast to all other users in the room
    socket.to(roomId).emit('code-change', data);
  });

  // Handle language changes
  socket.on('language-change', (data) => {
    const { roomId, language } = data;
    
    // Update room state
    if (rooms.has(roomId)) {
      const roomData = rooms.get(roomId);
      rooms.set(roomId, { ...roomData, language });
    }
    
    // Broadcast to all other users in the room
    socket.to(roomId).emit('language-change', data);
  });

  // Voice chat handlers
  socket.on('join-voice-room', (data) => {
    const { roomId, peerId, userName } = data;
    console.log(`🔊 User ${userName} (${peerId}) joined voice room ${roomId}`);
    
    // Initialize voice room if it doesn't exist
    if (!voiceRooms.has(roomId)) {
      voiceRooms.set(roomId, []);
      console.log(`🔊 Created new voice room: ${roomId}`);
    }
    
    // Add participant to voice room
    const participants = voiceRooms.get(roomId);
    const existingParticipant = participants.find(p => p.peerId === peerId);
    
    if (!existingParticipant) {
      const participant = { 
        peerId, 
        userName, 
        socketId: socket.id 
      };
      participants.push(participant);
      voiceRooms.set(roomId, participants);
      
      console.log(`🔊 Added participant. Room ${roomId} now has ${participants.length} participants:`, participants.map(p => p.userName));
      
      // Join socket room for voice
      socket.join(`voice-${roomId}`);
      
      // Notify other participants about new user
      console.log(`🔊 Notifying other participants about ${userName}`);
      socket.to(`voice-${roomId}`).emit('voice-user-joined', participant);
      
      // Send current participants list to the new user (excluding themselves)
      const otherParticipants = participants.filter(p => p.peerId !== peerId);
      console.log(`🔊 Sending ${otherParticipants.length} existing participants to ${userName}`);
      socket.emit('voice-participants', otherParticipants);
      
      // Also broadcast updated full list to everyone in the room
      console.log(`🔊 Broadcasting full participant list to room ${roomId}`);
      io.to(`voice-${roomId}`).emit('voice-participants', participants);
    } else {
      console.log(`🔊 User ${userName} already in voice room ${roomId}`);
    }
  });

  socket.on('leave-voice-room', (data) => {
    const { roomId, peerId } = data;
    console.log(`User ${peerId} left voice room ${roomId}`);
    
    if (voiceRooms.has(roomId)) {
      const participants = voiceRooms.get(roomId);
      const updatedParticipants = participants.filter(p => p.peerId !== peerId);
      voiceRooms.set(roomId, updatedParticipants);
      
      // Leave socket room
      socket.leave(`voice-${roomId}`);
      
      // Notify other participants
      socket.to(`voice-${roomId}`).emit('voice-user-left', { peerId });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Clean up voice rooms when user disconnects
    voiceRooms.forEach((participants, roomId) => {
      const userParticipant = participants.find(p => p.socketId === socket.id);
      if (userParticipant) {
        const updatedParticipants = participants.filter(p => p.socketId !== socket.id);
        voiceRooms.set(roomId, updatedParticipants);
        
        // Notify other participants
        socket.to(`voice-${roomId}`).emit('voice-user-left', { peerId: userParticipant.peerId });
      }
    });
  });
});

// JDoodle API endpoint for code execution
app.post('/run', async (req, res) => {
  try {
    const { code, language } = req.body;
    
    // JDoodle language mapping
    const languageMap = {
      'javascript': 'nodejs',
      'python': 'python3',
      'java': 'java',
      'cpp': 'cpp17',
      'c': 'c'
    };

    const jdoodleLanguage = languageMap[language] || 'nodejs';
    
    const response = await axios.post('https://api.jdoodle.com/v1/execute', {
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
      script: code,
      language: jdoodleLanguage,
      versionIndex: '0'
    });

    res.json({
      output: response.data.output,
      memory: response.data.memory,
      cpuTime: response.data.cpuTime
    });
  } catch (error) {
    console.error('JDoodle API error:', error);
    res.status(500).json({
      error: 'Code execution failed',
      message: error.response?.data?.error || error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', rooms: rooms.size, voiceRooms: voiceRooms.size });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Peer Programming Backend Server', 
    status: 'running',
    endpoints: ['/health', '/run'],
    rooms: rooms.size,
    voiceRooms: voiceRooms.size
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});