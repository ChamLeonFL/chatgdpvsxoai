// server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import path from 'path';
import 'dotenv/config';  // tự load .env

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 1. Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// 2. Định nghĩa Schema & Model
const MessageSchema = new mongoose.Schema({
  username: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// 3. Phục vụ file tĩnh ở public/
app.use(express.static(path.join(process.cwd(), 'public')));

// 4. Xử lý kết nối realtime với Socket.io
io.on('connection', socket => {
  console.log('🔌 New client connected:', socket.id);

  // Gửi 50 tin nhắn gần nhất khi vừa connect
  Message.find().sort({ createdAt: -1 }).limit(50).exec((err, msgs) => {
    if (err) return console.error(err);
    socket.emit('init', msgs.reverse());
  });

  // Khi nhận tin nhắn từ client
  socket.on('chat message', async ({ username, text }) => {
    const msg = new Message({ username, text });
    await msg.save();            // lưu DB
    io.emit('chat message', msg); // gửi tới tất cả client
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// 5. Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
