# Production Deployment Guide

## Current Issues Found:
1. ✅ Backend URL was set to placeholder `https://your-backend-url.onrender.com`  
2. ✅ Fixed: Updated to `https://peer-backend.onrender.com`
3. ✅ Added proper backend endpoints for testing
4. ✅ Updated CORS to allow production frontend

## Steps to Deploy:

### 1. Deploy Backend to Render
Your backend code is ready. Deploy it to Render with these environment variables:
```
JDOODLE_CLIENT_ID=73c1f4a2db297e96d1eb83b92f2b085c
JDOODLE_CLIENT_SECRET=912d70f465aff6db03efcf9fec2ed1ce832007b172b18fb756ac7fadd5eafdb
CLIENT_URL=https://peer-kohl.vercel.app
PORT=10000
SUPABASE_URL=https://ddnuptnfnbdzpsnzrqep.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbnVwdG5mbmJkenBzbnpycWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5Mjc0OTUsImV4cCI6MjA2OTUwMzQ5NX0.tnBf95yCPXZ1_gAMTQTSxlSeztP_DktVMmMYV41NGpE
```

### 2. Deploy Frontend to Vercel
```bash
cd client
npm run build
vercel --prod
```

### 3. Test Production Voice Chat
Once deployed, test:
1. Open two browser tabs: https://peer-kohl.vercel.app
2. Create a room and invite a friend
3. Both users join voice chat
4. Check browser console for any WebRTC errors

## Voice Chat Troubleshooting:

### Common Production Issues:
1. **STUN/TURN Server Issues**: Using free servers that may be unreliable
2. **WebRTC NAT Traversal**: Corporate firewalls blocking WebRTC
3. **Socket.IO Connection**: Backend not receiving voice room events

### Debug Steps:
1. Open browser DevTools → Console
2. Look for these errors:
   - `PeerJS: ERROR` - WebRTC connection issues
   - `Socket.IO connection failed` - Backend connectivity
   - `getUserMedia failed` - Microphone permissions

### Fallback Options:
If PeerJS free servers fail, consider:
- Upgrading to PeerJS paid tier
- Using Twilio's free tier (limited minutes)
- Self-hosting a PeerJS server