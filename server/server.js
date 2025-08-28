const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const server = http.createServer(app);

// ===== 보안 및 미들웨어 설정 =====
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// ===== CORS 설정 =====
const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
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

// ===== 데이터 저장소 클래스 =====
class DataStore {
  constructor() {
    this.users = new Map();
    this.chatRooms = new Map();
    this.musicRooms = new Map();
    this.chatMessages = new Map();
  }

  // 사용자 관리
  addUser(socketId, userData) {
    const user = {
      id: socketId,
      username: userData.username || `User_${socketId.slice(-4)}`,
      joinedAt: new Date().toISOString(),
      socketId: socketId,
      type: userData.type || 'chat'
    };
    this.users.set(socketId, user);
    return user;
  }

  getUser(socketId) {
    return this.users.get(socketId);
  }

  removeUser(socketId) {
    return this.users.delete(socketId);
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  // 채팅룸 관리
  createChatRoom(roomId, roomData) {
    const room = {
      id: roomId,
      name: roomData.name || roomId,
      participants: new Set(),
      creator: roomData.creator,
      createdAt: Date.now(),
      hasPassword: roomData.hasPassword || false,
      password: roomData.password,
      maxUsers: roomData.maxUsers || 50,
      lastMessage: roomData.lastMessage || 'Room created!',
      lastMessageTime: roomData.lastMessageTime || Date.now()
    };
    this.chatRooms.set(roomId, room);
    return room;
  }

  getChatRoom(roomId) {
    return this.chatRooms.get(roomId);
  }

  // 음악룸 관리
  createMusicRoom(roomId, roomData) {
    const room = {
      id: roomId,
      name: roomData.name || roomId,
      description: roomData.description || 'Music collaboration room',
      participants: new Set(),
      creator: roomData.creator,
      createdAt: Date.now(),
      hasPassword: roomData.hasPassword || false,
      password: roomData.password,
      maxUsers: roomData.maxUsers || 10,
      lastMessage: roomData.lastMessage || 'Music room created!',
      lastMessageTime: roomData.lastMessageTime || Date.now(),
      musicCount: 0,
      status: 'active',
      playlist: [],
      currentTrack: null,
      isPlaying: false,
      messages: []
    };
    this.musicRooms.set(roomId, room);
    return room;
  }

  getMusicRoom(roomId) {
    return this.musicRooms.get(roomId);
  }

  // 메시지 관리
  addChatMessage(roomId, messageData) {
    if (!this.chatMessages.has(roomId)) {
      this.chatMessages.set(roomId, []);
    }
    
    const message = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2)}`,
      userId: messageData.userId,
      username: messageData.username,
      message: messageData.message,
      type: messageData.type || 'text',
      timestamp: new Date().toISOString(),
      fileUrl: messageData.fileUrl,
      fileSize: messageData.fileSize,
      createdAt: Date.now()
    };

    const messages = this.chatMessages.get(roomId);
    messages.push(message);

    // 최대 100개 메시지만 보관
    if (messages.length > 100) {
      messages.splice(0, messages.length - 100);
    }

    // 룸의 마지막 메시지 업데이트
    const room = this.getChatRoom(roomId) || this.getMusicRoom(roomId);
    if (room) {
      room.lastMessage = message.message;
      room.lastMessageTime = message.createdAt;
    }

    return message;
  }

  getChatMessages(roomId) {
    return this.chatMessages.get(roomId) || [];
  }
}

// 데이터 저장소 인스턴스
const dataStore = new DataStore();

// ===== 디렉토리 생성 =====
const createDirectories = () => {
  const directories = [
    'uploads',
    'uploads/music', 
    'uploads/voice', 
    'uploads/chat'
  ];
  
  directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};

createDirectories();

// ===== Multer 파일 업로드 설정 =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = path.join(__dirname, 'uploads');
    
    if (file.fieldname === 'music') {
      uploadPath = path.join(__dirname, 'uploads/music');
    } else if (file.fieldname === 'voice') {
      uploadPath = path.join(__dirname, 'uploads/voice');
    } else {
      uploadPath = path.join(__dirname, 'uploads/chat');
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(extension, '')
      .replace(/[^a-zA-Z0-9가-힣]/g, '_')
      .substring(0, 50);
    
    const filename = `${timestamp}_${randomString}_${safeName}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB 제한
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp3|wav|ogg|m4a|webm|flac|aac|mpeg|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || 
                     file.mimetype.startsWith('audio/') || 
                     file.mimetype.startsWith('image/') ||
                     file.mimetype.startsWith('video/');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'));
    }
  }
});

// ===== API 라우트 =====
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'VLYNK Server v2.2.0 - Running',
    timestamp: new Date().toISOString(),
    features: [
      'Socket.IO Real-time Communication',
      'Chat Rooms with Music Room Support',
      'File Upload (Images, Audio, Video)',
      'User Management'
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    users: dataStore.getAllUsers().length,
    chatRooms: dataStore.chatRooms.size,
    musicRooms: dataStore.musicRooms.size
  });
});

// 파일 업로드 엔드포인트
app.post('/api/upload/chat', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileUrl = `/api/files/chat/${req.file.filename}`;
  res.json({
    success: true,
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype
    }
  });
});

app.post('/api/upload/music', upload.single('music'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No music file uploaded' });
  }

  const fileUrl = `/api/files/music/${req.file.filename}`;
  res.json({
    success: true,
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype
    }
  });
});

app.post('/api/upload/voice', upload.single('voice'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No voice file uploaded' });
  }

  const fileUrl = `/api/files/voice/${req.file.filename}`;
  res.json({
    success: true,
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype
    }
  });
});

// 파일 제공
app.get('/api/files/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const filePath = path.join(__dirname, 'uploads', type, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(filePath);
});

// 파일 다운로드
app.get('/api/download/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const filePath = path.join(__dirname, 'uploads', type, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath);
});

// ===== Socket.IO 이벤트 핸들러 =====
io.on('connection', (socket) => {
  console.log(`🔗 User connected: ${socket.id}`);
  
  // 연결 환영 메시지
  socket.emit('welcome', {
    message: 'VLYNK 서버에 연결되었습니다!',
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  // ===== 사용자 관리 이벤트 =====
  socket.on('user:register', (userData) => {
    const user = dataStore.addUser(socket.id, userData);
    
    socket.emit('user:registered', user);
    
    // 모든 클라이언트에게 사용자 목록 업데이트 알림
    io.emit('users:updated', {
      users: dataStore.getAllUsers(),
      totalUsers: dataStore.getAllUsers().length
    });

    console.log(`👤 User registered: ${userData.username || socket.id} (type: ${userData.type || 'chat'})`);
    
    // 등록 후 1초 뒤에 방 목록 전송
    setTimeout(() => {
      sendRoomList(socket, userData.type);
    }, 1000);
  });

  // ===== 방 관리 이벤트 (채팅룸 + 음악룸 통합) =====
  socket.on('room:create', (roomData) => {
    const { name, password, maxUsers, type, description } = roomData;
    const user = dataStore.getUser(socket.id);
    
    if (!name || !user) {
      socket.emit('room:error', { message: '방 생성에 필요한 정보가 없습니다.' });
      return;
    }

    let newRoom;
    
    if (type === 'music') {
      // 음악룸 생성
      if (dataStore.getMusicRoom(name)) {
        socket.emit('room:error', { message: '이미 존재하는 음악룸 이름입니다.' });
        return;
      }

      newRoom = dataStore.createMusicRoom(name, {
        name: name,
        description: description || 'Music collaboration room',
        creator: user.username || user.id,
        hasPassword: password && password.length > 0,
        password: password,
        maxUsers: maxUsers || 10,
        lastMessage: 'Music room created!',
        lastMessageTime: Date.now()
      });

      console.log(`🎵 Music Room created: ${name} by ${user.username}`);

    } else {
      // 채팅룸 생성
      if (dataStore.getChatRoom(name)) {
        socket.emit('room:error', { message: '이미 존재하는 방 이름입니다.' });
        return;
      }

      newRoom = dataStore.createChatRoom(name, {
        name: name,
        creator: user.username || user.id,
        hasPassword: password && password.length > 0,
        password: password,
        maxUsers: maxUsers || 50,
        lastMessage: 'Room created!',
        lastMessageTime: Date.now()
      });

      console.log(`🏠 Chat Room created: ${name} by ${user.username}`);
    }

    // 모든 클라이언트에게 업데이트된 방 목록 전송
    broadcastRoomList();
    
    // 방 생성자에게 성공 알림
    socket.emit('room:created', {
      room: {
        id: newRoom.id,
        name: newRoom.name,
        userCount: 0,
        maxUsers: newRoom.maxUsers,
        hasPassword: newRoom.hasPassword || false,
        creator: newRoom.creator,
        lastMessage: newRoom.lastMessage,
        lastMessageTime: newRoom.lastMessageTime,
        type: type || 'chat'
      }
    });
  });

  // 방 목록 요청
  socket.on('rooms:list', (params = {}) => {
    sendRoomList(socket, params.type);
  });

  socket.on('rooms:get', () => {
    sendRoomList(socket);
  });

  // 방 참여
  socket.on('room:join', (joinData) => {
    const { roomId, type, password } = joinData;
    const user = dataStore.getUser(socket.id);

    if (!roomId || !user) {
      socket.emit('room:error', { message: '방 참여에 필요한 정보가 없습니다.' });
      return;
    }

    let room;
    let roomPrefix;

    if (type === 'music') {
      room = dataStore.getMusicRoom(roomId);
      roomPrefix = 'music_';
    } else {
      room = dataStore.getChatRoom(roomId);
      roomPrefix = 'chat_';
    }

    if (!room) {
      socket.emit('room:error', { message: '존재하지 않는 방입니다.' });
      return;
    }

    // 비밀번호 확인
    if (room.hasPassword && room.creator !== user.username) {
      if (!password || password !== room.password) {
        socket.emit('room:error', { message: '비밀번호가 틀렸습니다.' });
        return;
      }
    }

    // 최대 인원 확인
    if (room.participants.size >= room.maxUsers) {
      socket.emit('room:error', { 
        message: `방이 가득 찼습니다. (${room.maxUsers}/${room.maxUsers})` 
      });
      return;
    }

    // 기존 룸에서 나가기
    leaveAllRooms(socket);

    // 새 룸 참여
    socket.join(`${roomPrefix}${roomId}`);
    room.participants.add(socket.id);

    const roomType = type === 'music' ? 'music' : 'chat';
    console.log(`${roomType === 'music' ? '🎵' : '💬'} ${user.username} joined ${roomType} room: ${room.name} (${room.participants.size}/${room.maxUsers})`);

    // 참여 성공 알림
    socket.emit('room:joined', {
      roomId: roomId,
      roomName: room.name,
      userCount: room.participants.size,
      maxUsers: room.maxUsers,
      type: roomType
    });

    // 다른 참가자들에게 알림
    socket.to(`${roomPrefix}${roomId}`).emit('room:user_joined', {
      userId: socket.id,
      username: user.username,
      userCount: room.participants.size
    });

    // 이전 메시지들 전송
    if (roomType === 'chat') {
      const recentMessages = dataStore.getChatMessages(roomId);
      recentMessages.forEach(message => {
        socket.emit('room:message', {
          ...message,
          isPrevious: true
        });
      });
    } else {
      // 음악룸 메시지 전송
      if (room.messages && room.messages.length > 0) {
        room.messages.forEach(message => {
          socket.emit('room:message', {
            ...message,
            isPrevious: true
          });
        });
      }
    }
  });

  // 채팅 메시지 (채팅룸과 음악룸 공통)
  socket.on('room:message', (data) => {
    const { roomId, message, type = 'text', fileUrl, fileSize, originalName } = data;
    const user = dataStore.getUser(socket.id);
    
    if (!roomId || (!message && !fileUrl) || !user) {
      socket.emit('room:error', { message: '메시지 데이터가 올바르지 않습니다.' });
      return;
    }

    // 메시지 저장
    const messageData = dataStore.addChatMessage(roomId, {
      userId: socket.id,
      username: user.username,
      message: message || originalName || 'File',
      type: type,
      fileUrl: fileUrl,
      fileSize: fileSize
    });

    // 채팅룸과 음악룸 모두 지원
    const room = dataStore.getChatRoom(roomId) || dataStore.getMusicRoom(roomId);
    if (room) {
      const roomPrefix = dataStore.getChatRoom(roomId) ? 'chat_' : 'music_';
      
      // 같은 방의 모든 사용자에게 메시지 전송
      io.to(`${roomPrefix}${roomId}`).emit('room:new_message', messageData);
      
      console.log(`💬 Message in room ${roomId}: ${type === 'text' ? message : `File: ${originalName}`}`);
    }
  });

  // 연결 해제
  socket.on('disconnect', (reason) => {
    console.log(`🔌 User disconnected: ${socket.id} (${reason})`);
    
    const user = dataStore.getUser(socket.id);
    
    // 모든 룸에서 제거
    leaveAllRooms(socket, user);
    
    // 사용자 제거
    dataStore.removeUser(socket.id);
    
    // 모든 클라이언트에게 사용자 목록 업데이트 알림
    io.emit('users:updated', {
      users: dataStore.getAllUsers(),
      totalUsers: dataStore.getAllUsers().length
    });
  });

  // ===== 헬퍼 함수들 =====
  function sendRoomList(socket, filterType = null) {
    const allRooms = [];
    
    // 채팅룸들 추가
    if (!filterType || filterType === 'chat') {
      Array.from(dataStore.chatRooms.values()).forEach(room => {
        allRooms.push({
          id: room.id,
          name: room.name,
          userCount: room.participants.size,
          maxUsers: room.maxUsers || 50,
          hasPassword: room.hasPassword || false,
          creator: room.creator,
          lastMessage: room.lastMessage || 'Room created!',
          lastMessageTime: room.lastMessageTime || Date.now(),
          type: 'chat'
        });
      });
    }

    // 음악룸들 추가
    if (!filterType || filterType === 'music') {
      Array.from(dataStore.musicRooms.values()).forEach(room => {
        allRooms.push({
          id: room.id,
          name: room.name,
          description: room.description,
          userCount: room.participants.size,
          maxUsers: room.maxUsers || 10,
          hasPassword: room.hasPassword || false,
          creator: room.creator,
          lastMessage: room.lastMessage || 'Music room created!',
          lastMessageTime: room.lastMessageTime || Date.now(),
          participants: room.participants.size,
          musicCount: room.musicCount || 0,
          status: room.status || 'active',
          createdBy: room.creator,
          createdAt: new Date(room.createdAt).toISOString(),
          updatedAt: new Date().toISOString(),
          type: 'music'
        });
      });
    }

    socket.emit('rooms:list', { rooms: allRooms });
    console.log(`📋 Sent ${allRooms.length} rooms to ${socket.id} (filter: ${filterType || 'all'})`);
  }

  function broadcastRoomList() {
    const allRooms = [];
    
    // 모든 채팅룸
    Array.from(dataStore.chatRooms.values()).forEach(room => {
      allRooms.push({
        id: room.id,
        name: room.name,
        userCount: room.participants.size,
        maxUsers: room.maxUsers || 50,
        hasPassword: room.hasPassword || false,
        creator: room.creator,
        lastMessage: room.lastMessage || 'Room created!',
        lastMessageTime: room.lastMessageTime || Date.now(),
        type: 'chat'
      });
    });

    // 모든 음악룸
    Array.from(dataStore.musicRooms.values()).forEach(room => {
      allRooms.push({
        id: room.id,
        name: room.name,
        description: room.description,
        userCount: room.participants.size,
        maxUsers: room.maxUsers || 10,
        hasPassword: room.hasPassword || false,
        creator: room.creator,
        lastMessage: room.lastMessage || 'Music room created!',
        lastMessageTime: room.lastMessageTime || Date.now(),
        participants: room.participants.size,
        musicCount: room.musicCount || 0,
        status: room.status || 'active',
        createdBy: room.creator,
        createdAt: new Date(room.createdAt).toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'music'
      });
    });

    io.emit('rooms:list', { rooms: allRooms });
  }

  function leaveAllRooms(socket, user = null) {
    if (!user) user = dataStore.getUser(socket.id);
    
    // 채팅룸에서 제거
    dataStore.chatRooms.forEach((room, roomId) => {
      if (room.participants.has(socket.id)) {
        room.participants.delete(socket.id);
        socket.leave(`chat_${roomId}`);
        socket.to(`chat_${roomId}`).emit('room:user_left', {
          userId: socket.id,
          username: user?.username || 'Someone',
          userCount: room.participants.size
        });
      }
    });

    // 음악룸에서 제거
    dataStore.musicRooms.forEach((room, roomId) => {
      if (room.participants.has(socket.id)) {
        room.participants.delete(socket.id);
        socket.leave(`music_${roomId}`);
        socket.to(`music_${roomId}`).emit('room:user_left', {
          userId: socket.id,
          username: user?.username || 'Someone',
          userCount: room.participants.size
        });
      }
    });
  }
});

// ===== 에러 핸들링 미들웨어 =====
app.use((error, req, res, next) => {
  console.error('💥 Server Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '파일 크기가 너무 큽니다. (최대 50MB)' });
    }
    return res.status(400).json({ error: '파일 업로드 오류: ' + error.message });
  }
  
  if (error) {
    console.error('❌ General error:', error);
    return res.status(400).json({ error: error.message || '알 수 없는 오류가 발생했습니다.' });
  }
  
  res.status(500).json({
    error: {
      message: 'Internal Server Error',
      status: 500,
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
║              v2.3.0                  ║
╠══════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(30)} ║
║  Status: ✅ Running                  ║
║  Socket.IO: ✅ Active                ║
║  File Upload: ✅ Ready               ║
║  Music Rooms: ✅ Supported           ║
╚══════════════════════════════════════╝

🎯 Features Available:
   • Socket.IO Real-time Communication
   • Chat Rooms + Music Rooms
   • User management and presence
   • File Upload & Streaming (Images, Audio, Video)
   • Unified Room System
   
🔗 API Endpoints:
   • Main: http://localhost:${PORT}
   • Health: http://localhost:${PORT}/health
   • Upload Chat: POST /api/upload/chat
   • Upload Music: POST /api/upload/music
   • Upload Voice: POST /api/upload/voice
   • Files: GET /api/files/:type/:filename
   • Download: GET /api/download/:type/:filename
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

module.exports = { app, server, io, dataStore };