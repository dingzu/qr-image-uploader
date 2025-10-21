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
        console.log(`房间内有图片，大小: ${Math.round(room.imageData.length / 1024)}KB`);
        
        // 判断是否需要分块传输
        if (room.chunks && room.chunks.length > 0) {
          // 大图片，分块传输
          console.log(`大图片，已分块，共 ${room.totalChunks} 块`);
          socket.emit('room-image-info', {
            hasImage: true,
            isChunked: true,
            totalChunks: room.totalChunks,
            totalSize: room.imageData.length
          });
        } else {
          // 小图片，直接发送
          console.log(`小图片，直接发送`);
          socket.emit('room-image-info', {
            hasImage: true,
            isChunked: false
          });
          socket.emit('image-sent-to-phone', { imageData: room.imageData });
        }
      } else {
        console.log(`房间 ${roomId} 存在，但还没有图片数据`);
        socket.emit('room-image-info', {
          hasImage: false
        });
      }
    } else {
      console.log(`房间 ${roomId} 不存在`);
      socket.emit('room-image-info', {
        hasImage: false
      });
    }
  });

  // 浏览器端分块发送图片
  socket.on('send-image-chunk', ({ roomId, chunkIndex, totalChunks, chunk, isLastChunk }) => {
    console.log(`收到图片分块，房间: ${roomId}, 块: ${chunkIndex + 1}/${totalChunks}`);
    
    // 初始化房间的分块接收器
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        chunks: new Array(totalChunks),
        totalChunks: totalChunks,
        receivedChunks: 0,
        timestamp: Date.now()
      });
      console.log(`创建房间 ${roomId}，准备接收 ${totalChunks} 个分块`);
    }
    
    const room = rooms.get(roomId);
    room.chunks[chunkIndex] = chunk;
    room.receivedChunks++;
    
    console.log(`房间 ${roomId} 已接收 ${room.receivedChunks}/${totalChunks} 个分块`);
    
    // 所有分块接收完成
    if (isLastChunk && room.receivedChunks === totalChunks) {
      console.log(`房间 ${roomId} 所有分块接收完成，开始组合`);
      
      // 组合所有分块
      const fullImageData = room.chunks.join('');
      console.log(`组合完成，总大小: ${Math.round(fullImageData.length / 1024)}KB`);
      
      // 存储完整图片
      room.imageData = fullImageData;
      
      // 通知发送者成功
      socket.emit('image-send-success');
      
      // 准备分块给手机端
      const CHUNK_SIZE = 100000;
      if (fullImageData.length > CHUNK_SIZE) {
        const totalChunksForPhone = Math.ceil(fullImageData.length / CHUNK_SIZE);
        room.totalChunks = totalChunksForPhone;
        room.chunks = [];
        
        for (let i = 0; i < totalChunksForPhone; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, fullImageData.length);
          room.chunks.push(fullImageData.substring(start, end));
        }
        
        console.log(`为手机端准备了 ${totalChunksForPhone} 个分块`);
        
        // 通知手机端
        socket.to(roomId).emit('new-image-available', {
          totalChunks: totalChunksForPhone,
          totalSize: fullImageData.length,
          isChunked: true
        });
      } else {
        // 小图片直接发送
        socket.to(roomId).emit('new-image-available', { isChunked: false });
        socket.to(roomId).emit('image-sent-to-phone', { imageData: fullImageData });
      }
    }
  });
  
  // 浏览器发送图片到手机（支持分块传输）- 兼容小图片直接发送
  socket.on('send-image-to-phone', ({ roomId, imageData }) => {
    console.log(`发送图片到手机，房间: ${roomId}，图片大小: ${Math.round(imageData.length / 1024)}KB`);
    
    const CHUNK_SIZE = 100000; // 每块 100KB（增大块大小，减少传输次数）
    
    // 将图片存储在房间中（包含分块信息）
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { 
        imageData: imageData, 
        timestamp: Date.now(),
        chunks: [],
        totalChunks: 0,
        chunkSize: CHUNK_SIZE
      });
      console.log(`创建新房间 ${roomId} 并存储图片`);
    } else {
      const room = rooms.get(roomId);
      room.imageData = imageData;
      room.timestamp = Date.now();
      room.chunkSize = CHUNK_SIZE;
      console.log(`更新房间 ${roomId} 的图片数据`);
    }
    
    const room = rooms.get(roomId);
    
    // 立即发送图片到房间内的所有移动端（如果已经加入）
    const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
    const clientCount = clientsInRoom ? clientsInRoom.size : 0;
    console.log(`房间 ${roomId} 当前有 ${clientCount} 个客户端`);
    
    // 分块发送大图片
    if (imageData.length > CHUNK_SIZE) {
      console.log(`图片较大，使用分块传输，总大小: ${Math.round(imageData.length / 1024)}KB`);
      
      const totalChunks = Math.ceil(imageData.length / CHUNK_SIZE);
      room.totalChunks = totalChunks;
      
      // 预先切分所有分块
      room.chunks = [];
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, imageData.length);
        room.chunks.push(imageData.substring(start, end));
      }
      
      console.log(`图片已切分为 ${totalChunks} 块，通知接收端`);
      
      // 通知房间内所有手机端：有新图片到达，请查询
      socket.to(roomId).emit('new-image-available', { 
        totalChunks: totalChunks, 
        totalSize: imageData.length,
        isChunked: true
      });
    } else {
      // 小图片直接发送
      console.log(`图片较小，直接发送到房间`);
      socket.to(roomId).emit('new-image-available', {
        isChunked: false
      });
      socket.to(roomId).emit('image-sent-to-phone', { imageData });
    }
    
    // 通知发送者成功
    socket.emit('image-send-success');
    
    console.log(`图片已存储到房间 ${roomId}`);
  });
  
  // 接收端请求下一个分块
  socket.on('request-next-chunk', ({ roomId, chunkIndex }) => {
    console.log(`收到分块请求，房间: ${roomId}, 块索引: ${chunkIndex}`);
    
    if (!rooms.has(roomId)) {
      console.error(`房间 ${roomId} 不存在`);
      socket.emit('transfer-error', { message: '房间不存在' });
      return;
    }
    
    const room = rooms.get(roomId);
    
    if (!room.chunks || chunkIndex >= room.chunks.length) {
      console.error(`无效的分块索引: ${chunkIndex}`);
      socket.emit('transfer-error', { message: '无效的分块索引' });
      return;
    }
    
    // 发送请求的分块到接收端
    const chunk = room.chunks[chunkIndex];
    const isLastChunk = chunkIndex === room.totalChunks - 1;
    
    console.log(`发送分块 ${chunkIndex + 1}/${room.totalChunks} 到接收端，大小: ${Math.round(chunk.length / 1024)}KB`);
    
    socket.emit('image-chunk', {
      chunkIndex: chunkIndex,
      totalChunks: room.totalChunks,
      chunk: chunk,
      isLastChunk: isLastChunk
    });
  });

  // 手机端上报进度
  socket.on('phone-progress-update', (data) => {
    console.log(`手机端进度更新，房间: ${data.roomId}, 进度: ${data.progress}%`);
    // 转发进度到房间内的发送者
    socket.to(data.roomId).emit('sender-progress-update', {
      progress: data.progress,
      chunkIndex: data.chunkIndex,
      totalChunks: data.totalChunks
    });
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

