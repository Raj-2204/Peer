# Peer Programming - Real-time Collaborative Code Editor

A free real-time collaborative code editor that allows teams to code together in the same file, similar to Google Docs but for programming.

## Features

- 🚀 Real-time collaborative editing using Yjs CRDT
- 🌐 Support for multiple programming languages (JavaScript, Python, Java, C, C++)
- ▶️ Code execution with JDoodle API integration
- 🔗 Shareable room URLs
- 🎨 Monaco Editor (same as VS Code)
- 📱 Responsive design

## Tech Stack

### Frontend
- React with Vite
- Monaco Editor
- Yjs for CRDT
- Socket.IO Client
- React Router

### Backend
- Node.js + Express
- Socket.IO for WebSocket connections
- JDoodle API for code execution

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- JDoodle API credentials (free at https://www.jdoodle.com/compiler-api)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Peer
   ```

2. **Install dependencies**
   ```bash
   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install
   ```

3. **Configure environment variables**
   
   **Server (.env in server/ folder):**
   ```env
   JDOODLE_CLIENT_ID=your_client_id_here
   JDOODLE_CLIENT_SECRET=your_client_secret_here
   CLIENT_URL=http://localhost:5173
   PORT=3001
   ```

   **Client (.env in client/ folder):**
   ```env
   VITE_SERVER_URL=http://localhost:3001
   ```

4. **Get JDoodle API credentials**
   - Sign up at https://www.jdoodle.com/compiler-api
   - Get your free API credentials (200 calls/day)
   - Update the server/.env file with your credentials

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```

2. **Start the frontend (in a new terminal)**
   ```bash
   cd client
   npm run dev
   ```

3. **Open your browser**
   - Go to http://localhost:5173
   - Click "Create Room" to start a collaborative session
   - Share the room URL with others to collaborate

## Deployment

### Frontend (Vercel)
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Set the root directory to `client/`
4. Set the build command to `npm run build`
5. Set the output directory to `dist/`
6. Add environment variable: `VITE_SERVER_URL=https://your-server-url.onrender.com`

### Backend (Render)
1. Push your code to GitHub
2. Create a new Web Service on Render
3. Connect your GitHub repo
4. Set the root directory to `server/`
5. Set the build command to `npm install`
6. Set the start command to `npm start`
7. Add environment variables:
   - `JDOODLE_CLIENT_ID`
   - `JDOODLE_CLIENT_SECRET`
   - `CLIENT_URL` (your Vercel frontend URL)

## Usage

1. **Creating a Room**: Click "Create Room" on the home page
2. **Joining a Room**: Share the room URL with others
3. **Collaborative Editing**: All users see changes in real-time
4. **Running Code**: Select language and click "Run Code"
5. **Language Support**: JavaScript, Python, Java, C, C++

## Project Structure

```
Peer/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── CodeEditor.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   └── Room.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vercel.json
├── server/                 # Node.js backend
│   ├── index.js
│   ├── package.json
│   └── .env
└── README.md
```

## API Endpoints

### Server Endpoints
- `GET /health` - Health check
- `POST /run` - Execute code using JDoodle API

### Socket.IO Events
- `join-room` - Join a collaborative room
- `code-change` - Broadcast code changes
- `language-change` - Broadcast language changes
- `room-state` - Get current room state

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details