const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS configuration - allow Vercel domains and any origin for development
const allowedOrigins = [
  'https://frontend-mailbox.vercel.app',
  'https://frontend-sender.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      // Also allow any vercel.app subdomain
      if (origin.endsWith('.vercel.app')) return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'TempMail Pro Backend is running!' });
});

// Make io available in routes
app.set('io', io);

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Socket.io connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_email', (emailId) => {
    socket.join(emailId);
    console.log(`User ${socket.id} joined room ${emailId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Railway provides PORT dynamically via environment variable
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`TempMail Pro Backend running on port ${PORT}`);
});
