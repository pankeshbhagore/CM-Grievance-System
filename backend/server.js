require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');

const connectDB = require('./config/db');
const routes = require('./routes/index');
const Complaint = require('./models/Complaint');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET', 'POST'] }
});

connectDB();

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/uploads', express.static(uploadsDir));

app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many login attempts, try again later' }));
app.use('/api/track/', rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: 'Too many tracking requests, try again later' }));

app.use((req, res, next) => { req.io = io; next(); });

app.use('/api', routes);
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date(), mode: process.env.NODE_ENV }));

app.use(notFound);
app.use(errorHandler);

// ---------- Socket.IO ----------
// Each authenticated socket joins a per-user room (`user_<id>`), which is the
// only reliable way to target a specific user. The previous implementation
// emitted to ad-hoc event names like `officer_${id}` which only worked if the
// listener was registered with that exact string — a fragile pattern that
// silently failed to notify anyone who reconnected with a new socket without
// re-subscribing to that literal event name.
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
    }
    next();
  } catch {
    next(); // allow unauthenticated connection; just won't join a user room
  }
});

io.on('connection', (socket) => {
  if (socket.userId) socket.join(`user_${socket.userId}`);
  socket.on('join_room', (room) => socket.join(room));
  socket.on('disconnect', () => {});
});

// ---------- Cron: hourly overdue sweep ----------
cron.schedule('0 * * * *', async () => {
  try {
    const updated = await Complaint.updateMany(
      { dueDate: { $lt: new Date() }, status: { $nin: ['resolved', 'rejected'] }, isOverdue: false },
      { $set: { isOverdue: true } }
    );
    if (updated.modifiedCount > 0) {
      io.emit('overdue_complaints', { count: updated.modifiedCount });
      console.log(`⏰ Marked ${updated.modifiedCount} complaints as overdue`);
    }
  } catch (err) {
    console.error('Cron error:', err.message);
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
