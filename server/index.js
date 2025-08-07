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

// Store room members by room (for presence tracking)
const roomMembers = new Map();

// Store chat messages by room
const roomMessages = new Map();

// Store diagram data by room
const roomDiagrams = new Map();

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

    // Initialize diagram for room if it doesn't exist
    if (!roomDiagrams.has(roomId)) {
      roomDiagrams.set(roomId, {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      });
    }
    
    // Send current room state to the joining user
    socket.emit('room-state', rooms.get(roomId));
    // Send current diagram state to the joining user
    socket.emit('diagram-state', roomDiagrams.get(roomId));
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

  // Member presence tracking handlers
  socket.on('join-room-member', (data) => {
    const { roomId, userId, userName, userAvatar } = data;
    
    console.log(`👤 Member ${userName} (${userId}) joined room ${roomId}`);
    
    // Initialize room members if it doesn't exist
    if (!roomMembers.has(roomId)) {
      roomMembers.set(roomId, []);
    }
    
    // Add member to room
    const members = roomMembers.get(roomId);
    const existingMember = members.find(m => m.userId === userId);
    
    if (!existingMember) {
      const member = {
        userId,
        userName,
        userAvatar,
        socketId: socket.id,
        joinedAt: new Date().toISOString()
      };
      
      members.push(member);
      roomMembers.set(roomId, members);
      
      console.log(`👤 Room ${roomId} now has ${members.length} members:`, members.map(m => m.userName));
      
      // Join socket room for member updates
      socket.join(`members-${roomId}`);
      
      // Notify room about new member
      socket.to(`members-${roomId}`).emit('member-joined', member);
      
      // Send current members list to new member
      socket.emit('room-members-update', members);
      
      // Also broadcast updated list to all members
      io.to(`members-${roomId}`).emit('room-members-update', members);
    } else {
      console.log(`👤 Member ${userName} already in room ${roomId}`);
      // Update socket ID in case of reconnection
      existingMember.socketId = socket.id;
      socket.join(`members-${roomId}`);
      socket.emit('room-members-update', members);
    }
  });

  socket.on('leave-room-member', (data) => {
    const { roomId, userId } = data;
    
    console.log(`👤 Member ${userId} left room ${roomId}`);
    
    if (roomMembers.has(roomId)) {
      const members = roomMembers.get(roomId);
      const leavingMember = members.find(m => m.userId === userId);
      const updatedMembers = members.filter(m => m.userId !== userId);
      
      roomMembers.set(roomId, updatedMembers);
      
      // Leave socket room
      socket.leave(`members-${roomId}`);
      
      // Notify other members
      if (leavingMember) {
        socket.to(`members-${roomId}`).emit('member-left', leavingMember);
        io.to(`members-${roomId}`).emit('room-members-update', updatedMembers);
      }
    }
  });

  // Chat handlers
  socket.on('join-chat-room', (data) => {
    const { roomId, userId, userName } = data;
    
    console.log(`💬 ${userName} joined chat in room ${roomId}`);
    
    // Initialize room messages if it doesn't exist
    if (!roomMessages.has(roomId)) {
      roomMessages.set(roomId, []);
    }
    
    // Join socket room for chat
    socket.join(`chat-${roomId}`);
    
    // Send chat history to joining user
    const messages = roomMessages.get(roomId);
    socket.emit('chat-history', messages);
  });

  socket.on('send-message', (messageData) => {
    const { roomId, userId, userName, userAvatar, message, timestamp } = messageData;
    
    console.log(`💬 Message from ${userName} in room ${roomId}:`, message);
    
    // Create message object
    const messageObj = {
      userId,
      userName,
      userAvatar,
      message,
      timestamp,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    
    // Store message in room history
    if (!roomMessages.has(roomId)) {
      roomMessages.set(roomId, []);
    }
    
    const messages = roomMessages.get(roomId);
    messages.push(messageObj);
    
    // Keep only last 100 messages per room
    if (messages.length > 100) {
      messages.splice(0, messages.length - 100);
    }
    
    roomMessages.set(roomId, messages);
    
    // Broadcast message to all users in the chat room
    io.to(`chat-${roomId}`).emit('new-message', messageObj);
  });

  // Collaborative cursor handlers
  socket.on('cursor-change', (data) => {
    const { roomId, userId, userName, position, color } = data;
    
    // Broadcast cursor position to all other users in the room
    socket.to(roomId).emit('cursor-change', {
      userId,
      userName,
      position,
      color
    });
  });

  socket.on('edit-highlight', (data) => {
    const { roomId, userId, startPos, endPos, color } = data;
    
    // Broadcast edit highlight to all other users in the room
    socket.to(roomId).emit('edit-highlight', {
      userId,
      startPos,
      endPos,
      color
    });
  });

  // Diagram handlers
  socket.on('join-diagram', (roomId) => {
    socket.join(`diagram-${roomId}`);
    console.log(`User ${socket.id} joined diagram room ${roomId}`);
    
    // Send current diagram state to the joining user
    if (roomDiagrams.has(roomId)) {
      socket.emit('diagram-state', roomDiagrams.get(roomId));
    }
  });

  socket.on('diagram-change', (data) => {
    const { roomId, nodes, edges, viewport } = data;
    
    console.log(`Diagram change in room ${roomId}`);
    
    // Update room diagram state
    if (roomDiagrams.has(roomId)) {
      roomDiagrams.set(roomId, { nodes, edges, viewport });
    }
    
    // Broadcast to all other users in the diagram room
    socket.to(`diagram-${roomId}`).emit('diagram-change', { nodes, edges, viewport });
  });

  socket.on('diagram-node-change', (data) => {
    const { roomId, nodeId, changes } = data;
    
    console.log(`Node ${nodeId} changed in room ${roomId}`);
    
    // Broadcast node change to all other users in the diagram room
    socket.to(`diagram-${roomId}`).emit('diagram-node-change', { nodeId, changes });
  });

  socket.on('diagram-edge-change', (data) => {
    const { roomId, edgeId, changes } = data;
    
    console.log(`Edge ${edgeId} changed in room ${roomId}`);
    
    // Broadcast edge change to all other users in the diagram room
    socket.to(`diagram-${roomId}`).emit('diagram-edge-change', { edgeId, changes });
  });

  socket.on('diagram-viewport-change', (data) => {
    const { roomId, viewport } = data;
    
    // Update room diagram viewport
    if (roomDiagrams.has(roomId)) {
      const diagramData = roomDiagrams.get(roomId);
      diagramData.viewport = viewport;
      roomDiagrams.set(roomId, diagramData);
    }
    
    // Broadcast viewport change to all other users in the diagram room
    socket.to(`diagram-${roomId}`).emit('diagram-viewport-change', { viewport });
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

    // Clean up room members when user disconnects
    roomMembers.forEach((members, roomId) => {
      const userMember = members.find(m => m.socketId === socket.id);
      if (userMember) {
        const updatedMembers = members.filter(m => m.socketId !== socket.id);
        roomMembers.set(roomId, updatedMembers);
        
        console.log(`👤 Member ${userMember.userName} disconnected from room ${roomId}`);
        
        // Notify other members
        socket.to(`members-${roomId}`).emit('member-left', userMember);
        socket.to(`members-${roomId}`).emit('room-members-update', updatedMembers);
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
  res.json({ 
    status: 'OK', 
    rooms: rooms.size, 
    voiceRooms: voiceRooms.size,
    roomMembers: roomMembers.size,
    roomMessages: roomMessages.size,
    roomDiagrams: roomDiagrams.size
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Peer Programming Backend Server', 
    status: 'running',
    endpoints: ['/health', '/run'],
    rooms: rooms.size,
    voiceRooms: voiceRooms.size,
    roomMembers: roomMembers.size,
    roomMessages: roomMessages.size,
    roomDiagrams: roomDiagrams.size
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});