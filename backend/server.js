const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Use a more permissive CORS for development
app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*", // allow all origins
    methods: ["GET", "POST"]
  }
});

// Make io available in routes
app.set('io', io);

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Socket.io connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Clients can join a room based on the email ID
  socket.on('join_email', (emailId) => {
    socket.join(emailId);
    console.log(`User ${socket.id} joined room ${emailId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT} (Using In-Memory Storage)`);
});
