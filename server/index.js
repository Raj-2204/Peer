const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store active rooms and their documents
const rooms = new Map();

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

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
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
  res.json({ status: 'OK', rooms: rooms.size });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});