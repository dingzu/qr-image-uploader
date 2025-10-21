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

  // 浏览器端加入发送者房间
  socket.on('join-sender-room', (roomId) => {
    socket.join(roomId);
    console.log(`浏览器端加入发送者房间: ${roomId}`);
  });

  // 移动端加入接收房间（用于接收浏览器发送的图片）
  socket.on('join-receive-room', (roomId) => {
    socket.join(roomId);
    console.log(`移动端加入接收房间: ${roomId}`);
    socket.emit('receive-room-joined', roomId);
    
    // 通知房间内的浏览器端：手机已加入
    socket.to(roomId).emit('phone-joined-room');
    console.log(`已通知房间 ${roomId} 的发送者：手机已加入`);
  });

  // 手机端请求房间内已有的图片
  socket.on('request-room-image', (roomId) => {
    console.log(`手机端请求房间图片: ${roomId}`);
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      if (room.imageData) {
        console.log(`发送已存在的图片到手机，大小: ${Math.round(room.imageData.length / 1024)}KB`);
        socket.emit('image-sent-to-phone', { imageData: room.imageData });
      } else {
        console.log(`房间 ${roomId} 存在，但还没有图片数据`);
      }
    } else {
      console.log(`房间 ${roomId} 不存在`);
    }
  });

  // 浏览器发送图片到手机（支持分块传输）
  socket.on('send-image-to-phone', ({ roomId, imageData }) => {
    console.log(`发送图片到手机，房间: ${roomId}，图片大小: ${Math.round(imageData.length / 1024)}KB`);
    
    // 将图片存储在服务器内存中（简单实现）
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { imageData: imageData, timestamp: Date.now() });
      console.log(`创建新房间 ${roomId} 并存储图片`);
    } else {
      const room = rooms.get(roomId);
      room.imageData = imageData;
      room.timestamp = Date.now();
      console.log(`更新房间 ${roomId} 的图片数据`);
    }
    
    // 立即发送图片到房间内的所有移动端（如果已经加入）
    const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
    const clientCount = clientsInRoom ? clientsInRoom.size : 0;
    console.log(`房间 ${roomId} 当前有 ${clientCount} 个客户端`);
    
    // 分块发送大图片
    const CHUNK_SIZE = 50000; // 每块 50KB
    if (imageData.length > CHUNK_SIZE) {
      console.log(`图片较大，开始分块传输，总大小: ${Math.round(imageData.length / 1024)}KB`);
      
      const totalChunks = Math.ceil(imageData.length / CHUNK_SIZE);
      
      // 通知开始传输
      io.to(roomId).emit('image-transfer-start', { totalChunks, totalSize: imageData.length });
      
      // 分块发送
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, imageData.length);
        const chunk = imageData.substring(start, end);
        
        io.to(roomId).emit('image-chunk', {
          chunkIndex: i,
          totalChunks: totalChunks,
          chunk: chunk,
          isLastChunk: i === totalChunks - 1
        });
      }
      
      console.log(`分块传输完成，共 ${totalChunks} 块`);
    } else {
      // 小图片直接发送
      io.to(roomId).emit('image-sent-to-phone', { imageData });
    }
    
    // 通知发送者成功
    socket.emit('image-send-success');
    
    console.log(`图片已存储并广播到房间 ${roomId}`);
  });

  // 手机端通知已收到图片
  socket.on('phone-received-image', (roomId) => {
    console.log(`手机端确认收到图片，房间: ${roomId}`);
    // 通知浏览器端：手机已收到图片
    socket.to(roomId).emit('image-received-by-phone');
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

