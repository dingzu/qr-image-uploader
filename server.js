const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// 存储房间和图片数据
const rooms = new Map();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

// PC 端页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pc.html'));
});

// 移动端上传页面
app.get('/upload/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mobile.html'));
});

// 移动端接收页面（用于接收浏览器发送的图片）
app.get('/receive/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'receive.html'));
});

// Socket.IO 连接处理
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // PC 端创建房间
  socket.on('create-room', (roomId) => {
    socket.join(roomId);
    rooms.set(roomId, { pcSocket: socket.id, image: null });
    console.log(`房间已创建: ${roomId}`);
    socket.emit('room-created', roomId);
  });

  // 移动端加入房间
  socket.on('join-room', (roomId) => {
    if (rooms.has(roomId)) {
      socket.join(roomId);
      console.log(`移动端加入房间: ${roomId}`);
      socket.emit('room-joined', roomId);
      // 通知 PC 端有移动端连接
      io.to(roomId).emit('mobile-connected');
    } else {
      socket.emit('room-not-found');
    }
  });

  // 移动端上传图片
  socket.on('upload-image', ({ roomId, imageData }) => {
    console.log(`收到图片上传请求，房间: ${roomId}`);
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.image = imageData;
      // 发送图片到 PC 端
      io.to(roomId).emit('image-received', imageData);
      // 通知移动端上传成功
      socket.emit('upload-success');
    }
  });

  // 移动端加入接收房间（用于接收浏览器发送的图片）
  socket.on('join-receive-room', (roomId) => {
    socket.join(roomId);
    console.log(`移动端加入接收房间: ${roomId}`);
    socket.emit('receive-room-joined', roomId);
  });

  // 浏览器发送图片到手机
  socket.on('send-image-to-phone', ({ roomId, imageData }) => {
    console.log(`发送图片到手机，房间: ${roomId}`);
    // 发送图片到房间内的所有移动端
    io.to(roomId).emit('image-sent-to-phone', { imageData });
    // 通知发送者成功
    socket.emit('image-send-success');
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log('用户断开:', socket.id);
    // 清理房间
    for (const [roomId, room] of rooms.entries()) {
      if (room.pcSocket === socket.id) {
        rooms.delete(roomId);
        console.log(`房间已删除: ${roomId}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

