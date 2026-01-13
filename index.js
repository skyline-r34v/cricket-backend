const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect Database
connectDB();

// Routes
app.use('/api/matches', require('./routes/matches'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/auth', require('./routes/auth'));

// Seed Admin User
const User = require('./models/User');
const seedAdmin = async () => {
    const exists = await User.findOne({ username: 'admin' });
    if (!exists) {
        const admin = new User({ username: 'admin', password: 'admin' });
        await admin.save();
        console.log('Admin user created');
    }
};
seedAdmin();

app.get('/', (req, res) => {
    res.send('Cricket Tournament API is running');
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Helper to broadcast score updates
const broadcastMatchUpdate = (matchId, data) => {
    io.emit(`match:${matchId}`, data);
};

// Make io accessible in request (optional pattern)
app.use((req, res, next) => {
    req.io = io;
    next();
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
