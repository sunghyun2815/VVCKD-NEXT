const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// ===== CORS 설정 =====
const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===== Socket.IO 설정 =====
const io = socketIo(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// ===== 디렉토리 생성 =====
const createDirectories = () => {
  const directories = ['uploads', 'uploads/music', 'uploads/voice', 'uploads/chat'];
  
  directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};

createDirectories();

// ===== 데이터 저장소 =====
class DataStore {
  constructor() {
    this.connectedUsers = new Map();
    this.chatRooms = new Map();
    this.chatMessages = new Map();
    this.musicRooms = new Map();
  }

  // 사용자 관리
  addUser(socketId, userData) {
    const user = {
      id: socketId,
      socketId: socketId,
      joinedAt: new Date().toISOString(),
      ...userData
    };
    this.connectedUsers.set(socketId, user);
    return user;
  }

  removeUser(socketId) {
    return this.connectedUsers.delete(socketId);
  }

  getUser(socketId) {
    return this.connectedUsers.get(socketId);
  }

  getAllUsers() {
    return Array.from(this.connectedUsers.values());
  }

  // 채팅룸 관리
  createChatRoom(roomId, roomData = {}) {
    const room = {
      id: roomId,
      name: roomData.name || `Chat Room ${roomId}`,
      participants: new Set(),
      createdAt: new Date().toISOString(),
      ...roomData
    };
    this.chatRooms.set(roomId, room);
    this.chatMessages.set(roomId, []);
    return room;
  }

  getChatRoom(roomId) {
    return this.chatRooms.get(roomId);
  }

  addChatMessage(roomId, messageData) {
    if (!this.chatMessages.has(roomId)) {
      this.chatMessages.set(roomId, []);
    }
    
    const message = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...messageData
    };
    
    this.chatMessages.get(roomId).push(message);
    
    // 메시지 개수 제한 (최근 100개만 유지)
    const messages = this.chatMessages.get(roomId);
    if (messages.length > 100) {
      this.chatMessages.set(roomId, messages.slice(-100));
    }
    
    return message;
  }

  getChatMessages(roomId, limit = 50) {
    const messages = this.chatMessages.get(roomId) || [];
    return messages.slice(-limit);
  }
}

const dataStore = new DataStore();

// ===== 기본 라우트 =====
app.get('/', (req, res) => {
  res.json({
    service: '🚀 VLYNK Server',
    version: '2.1.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    features: [
      'Socket.IO Real-time Communication',
      'Chat Rooms',
      'User Management',
      'File Upload Ready'
    ],
    stats: {
      connectedUsers: dataStore.getAllUsers().length,
      chatRooms: dataStore.chatRooms.size,
      totalMessages: Array.from(dataStore.chatMessages.values()).reduce((total, messages) => total + messages.length, 0)
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage()
  });
});

// ===== 정적 파일 제공 =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== Socket.IO 이벤트 핸들러 =====
io.on('connection', (socket) => {
  console.log(`🔗 User connected: ${socket.id}`);
  
  // 연결 환영 메시지
  socket.emit('welcome', {
    message: 'VLYNK 서버에 연결되었습니다!',
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  // === 사용자 관리 이벤트 ===
  socket.on('user:register', (userData) => {
    const user = dataStore.addUser(socket.id, userData);
    
    socket.emit('user:registered', user);
    
    // 모든 클라이언트에게 사용자 목록 업데이트 알림
    io.emit('users:updated', {
      users: dataStore.getAllUsers(),
      totalUsers: dataStore.getAllUsers().length
    });

    console.log(`👤 User registered: ${userData.username || socket.id}`);
  });

  // === 채팅룸 이벤트 ===
  socket.on('chat:join', (roomId) => {
    // 기존 룸에서 나가기
    socket.rooms.forEach(room => {
      if (room !== socket.id && room.startsWith('chat_')) {
        socket.leave(room);
      }
    });

    socket.join(`chat_${roomId}`);
    
    // 룸이 없으면 생성
    let room = dataStore.getChatRoom(roomId);
    if (!room) {
      room = dataStore.createChatRoom(roomId, { name: `Chat Room ${roomId}` });
    }
    
    room.participants.add(socket.id);

    // 최근 메시지 전송
    const recentMessages = dataStore.getChatMessages(roomId);
    socket.emit('chat:messages', recentMessages);
    
    // 룸 정보 전송
    socket.emit('chat:room_info', {
      roomId: roomId,
      roomName: room.name,
      participants: Array.from(room.participants),
      participantCount: room.participants.size
    });

    // 다른 참가자들에게 입장 알림
    socket.to(`chat_${roomId}`).emit('chat:user_joined', {
      userId: socket.id,
      user: dataStore.getUser(socket.id),
      message: `${dataStore.getUser(socket.id)?.username || 'Someone'}님이 입장했습니다.`
    });

    console.log(`💬 User ${socket.id} joined chat room: ${roomId}`);
  });

  socket.on('chat:message', (data) => {
    const { roomId, message, type = 'text' } = data;
    const user = dataStore.getUser(socket.id);
    
    if (!roomId || !message) {
      socket.emit('chat:error', { message: '메시지 데이터가 올바르지 않습니다.' });
      return;
    }

    const messageData = dataStore.addChatMessage(roomId, {
      userId: socket.id,
      username: user?.username || 'Anonymous',
      message: message,
      type: type
    });

    // 같은 방의 모든 사용자에게 메시지 전송 (본인 포함)
    io.to(`chat_${roomId}`).emit('chat:new_message', messageData);
    
    console.log(`💬 Message in room ${roomId}: ${message}`);
  });

  socket.on('chat:leave', (roomId) => {
    socket.leave(`chat_${roomId}`);
    
    const room = dataStore.getChatRoom(roomId);
    if (room) {
      room.participants.delete(socket.id);
    }

    // 다른 참가자들에게 퇴장 알림
    socket.to(`chat_${roomId}`).emit('chat:user_left', {
      userId: socket.id,
      user: dataStore.getUser(socket.id),
      message: `${dataStore.getUser(socket.id)?.username || 'Someone'}님이 퇴장했습니다.`
    });

    console.log(`💬 User ${socket.id} left chat room: ${roomId}`);
  });

  // === 테스트 이벤트 ===
  socket.on('test', (data) => {
    console.log('📨 Test message received:', data);
    socket.emit('test-response', {
      message: '테스트 메시지 수신 완료!',
      received: data,
      timestamp: new Date().toISOString(),
      socketId: socket.id
    });
  });

  // === 연결 해제 ===
  socket.on('disconnect', (reason) => {
    console.log(`🔌 User disconnected: ${socket.id}, reason: ${reason}`);
    
    // 사용자 제거
    const user = dataStore.getUser(socket.id);
    dataStore.removeUser(socket.id);
    
    // 모든 채팅룸에서 사용자 제거
    dataStore.chatRooms.forEach((room, roomId) => {
      if (room.participants.has(socket.id)) {
        room.participants.delete(socket.id);
        
        // 다른 참가자들에게 퇴장 알림
        socket.to(`chat_${roomId}`).emit('chat:user_left', {
          userId: socket.id,
          user: user,
          message: `${user?.username || 'Someone'}님이 연결을 종료했습니다.`
        });
      }
    });

    // 사용자 목록 업데이트
    io.emit('users:updated', {
      users: dataStore.getAllUsers(),
      totalUsers: dataStore.getAllUsers().length
    });
  });

  // === 에러 핸들링 ===
  socket.on('error', (error) => {
    console.error(`❌ Socket error from ${socket.id}:`, error);
    socket.emit('error_response', {
      message: '서버 에러가 발생했습니다.',
      error: error.message
    });
  });
});

// ===== 에러 핸들링 미들웨어 =====
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: 'Internal Server Error',
      status: err.status || 500,
      timestamp: new Date().toISOString()
    }
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404,
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    }
  });
});

// ===== 서버 시작 =====
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║           🚀 VLYNK SERVER            ║
║              v2.1.0                  ║
╠══════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(30)} ║
║  Status: ✅ Running                  ║
║  Socket.IO: ✅ Active                ║
╚══════════════════════════════════════╝

🎯 Features Available:
   • Socket.IO Real-time Communication
   • Chat Rooms with persistent messages
   • User management and presence
   • File upload structure ready
   
🔗 Test URLs:
   • Main: http://localhost:${PORT}
   • Health: http://localhost:${PORT}/health
  `);
});

// ===== Graceful Shutdown =====
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});