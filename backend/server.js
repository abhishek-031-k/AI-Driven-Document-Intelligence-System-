require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/configs/db');
const { initSocket } = require('./src/sockets/socketHandler');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Database
connectDB();

// Create HTTP Server
//create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Pass IO instance to socket handler
initSocket(io);

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error.message);
});

// Start Server listening
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
