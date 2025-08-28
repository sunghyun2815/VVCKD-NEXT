const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');

// ===== EXPRESS 및 서버 설정 =====
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// ===== 미들웨어 설정 =====
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== 업로드 폴더 생성 =====
const uploadDirs = ['uploads/chat', 'uploads/music', 'uploads/voice'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ===== MULTER 설정 =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.baseUrl.includes('chat') ? 'chat' : 
                req.baseUrl.includes('music') ? 'music' : 'voice';
    cb(null, `uploads/${type}/`);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${timestamp}_${name}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp3|wav|ogg|mp4|webm|pdf|txt|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'));
    }
  }
});

// ===== 데이터 저장소 =====
class DataStore {
  constructor() {
    this.users = new Map(); // userId -> user info
    this.chatRooms = new Map(); // roomId -> room info  
    this.musicRooms = new Map(); // roomId -> music room info
    this.chatMessages = new Map(); // roomId -> messages[]
    this.musicComments = new Map(); // roomId -> comments[]
  }

  // 사용자 관리
  addUser(userId, userInfo) {
    this.users.set(userId, { ...userInfo, connectedAt: Date.now() });
  }

  removeUser(userId) {
    this.users.delete(userId);
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  // 채팅룸 관리
  createChatRoom(roomInfo) {
    const roomId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.chatRooms.set(roomId, {
      id: roomId,
      ...roomInfo,
      createdAt: Date.now(),
      users: new Set(),
      type: 'chat'
    });
    this.chatMessages.set(roomId, []);
    return this.chatRooms.get(roomId);
  }

  getChatRoom(roomId) {
    return this.chatRooms.get(roomId);
  }

  getAllChatRooms() {
    return Array.from(this.chatRooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      userCount: room.users.size,
      maxUsers: room.maxUsers,
      hasPassword: !!room.password,
      creator: room.creator,
      lastMessage: this.getLastMessage(room.id),
      lastMessageTime: this.getLastMessageTime(room.id)
    }));
  }

  joinChatRoom(roomId, userId, password = '') {
    const room = this.chatRooms.get(roomId);
    if (!room) return { success: false, message: 'Room not found' };
    
    if (room.password && room.password !== password) {
      return { success: false, message: 'Wrong password' };
    }
    
    if (room.users.size >= room.maxUsers) {
      return { success: false, message: 'Room is full' };
    }
    
    room.users.add(userId);
    return { success: true, room };
  }

  leaveChatRoom(roomId, userId) {
    const room = this.chatRooms.get(roomId);
    if (room) {
      room.users.delete(userId);
    }
  }

  // 채팅 메시지 관리
  addChatMessage(roomId, message) {
    if (!this.chatMessages.has(roomId)) {
      this.chatMessages.set(roomId, []);
    }
    const messages = this.chatMessages.get(roomId);
    messages.push(message);
    
    // 최대 1000개 메시지만 유지
    if (messages.length > 1000) {
      messages.shift();
    }
  }

  getChatMessages(roomId) {
    return this.chatMessages.get(roomId) || [];
  }

  getLastMessage(roomId) {
    const messages = this.getChatMessages(roomId);
    return messages.length > 0 ? messages[messages.length - 1].message : '';
  }

  getLastMessageTime(roomId) {
    const messages = this.getChatMessages(roomId);
    return messages.length > 0 ? new Date(messages[messages.length - 1].timestamp).getTime() : Date.now();
  }

  // 뮤직룸 관리 (기존 logic 유지)
  createMusicRoom(roomInfo) {
    const roomId = `music_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.musicRooms.set(roomId, {
      id: roomId,
      ...roomInfo,
      createdAt: Date.now(),
      users: new Set(),
      type: 'music',
      currentTrack: null,
      isPlaying: false,
      currentTime: 0
    });
    this.musicComments.set(roomId, []);
    return this.musicRooms.get(roomId);
  }

  getMusicRoom(roomId) {
    return this.musicRooms.get(roomId);
  }

  getAllMusicRooms() {
    return Array.from(this.musicRooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      userCount: room.users.size,
      maxUsers: room.maxUsers,
      hasPassword: !!room.password,
      creator: room.creator,
      description: room.description || '',
      tech: room.tech || [],
      status: room.users.size > 0 ? 'active' : 'inactive'
    }));
  }

  joinMusicRoom(roomId, userId, password = '') {
    const room = this.musicRooms.get(roomId);
    if (!room) return { success: false, message: 'Room not found' };
    
    if (room.password && room.password !== password) {
      return { success: false, message: 'Wrong password' };
    }
    
    if (room.users.size >= room.maxUsers) {
      return { success: false, message: 'Room is full' };
    }
    
    room.users.add(userId);
    return { success: true, room };
  }

  leaveMusicRoom(roomId, userId) {
    const room = this.musicRooms.get(roomId);
    if (room) {
      room.users.delete(userId);
    }
  }

  // 뮤직 댓글 관리
  addMusicComment(roomId, comment) {
    if (!this.musicComments.has(roomId)) {
      this.musicComments.set(roomId, []);
    }
    this.musicComments.get(roomId).push(comment);
  }

  getMusicComments(roomId) {
    return this.musicComments.get(roomId) || [];
  }
}

const dataStore = new DataStore();

// ===== API 라우트 =====
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'VLYNK Server v3.0.0 - Professional Edition',
    timestamp: new Date().toISOString(),
    features: [
      'Namespaced Socket.IO (/chat, /project)',
      'Separated Chat & Music Rooms',
      'Professional File Upload System',
      'Real-time User Management'
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    stats: {
      users: dataStore.getAllUsers().length,
      chatRooms: dataStore.chatRooms.size,
      musicRooms: dataStore.musicRooms.size
    }
  });
});

// ===== 파일 업로드 API =====
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
      mimetype: req.file.mimetype,
      type: req.file.mimetype.startsWith('image/') ? 'image' : 
            req.file.mimetype.startsWith('audio/') ? 'audio' :
            req.file.mimetype.startsWith('video/') ? 'video' : 'file'
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

// ===== 파일 제공 및 다운로드 =====
app.get('/api/files/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const filePath = path.join(__dirname, 'uploads', type, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(filePath);
});

app.get('/api/download/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const filePath = path.join(__dirname, 'uploads', type, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath);
});

// ===== SOCKET.IO 네임스페이스 분리 =====

// 🗨️ CHAT 네임스페이스
const chatNamespace = io.of('/chat');
chatNamespace.on('connection', (socket) => {
  console.log(`🗨️ Chat user connected: ${socket.id}`);

  // 사용자 로그인
  socket.on('user:login', (userData) => {
    const user = {
      id: socket.id,
      username: userData.username,
      role: userData.role || 'MEMBER',
      namespace: 'chat'
    };
    
    dataStore.addUser(socket.id, user);
    socket.user = user;
    
    console.log(`👤 Chat user logged in: ${user.username}`);
    socket.emit('user:login_success', { user, connectedUsers: dataStore.getAllUsers().length });
    
    // 모든 채팅룸 목록 전송
    socket.emit('rooms:list', dataStore.getAllChatRooms());
  });

  // 채팅룸 생성
  socket.on('room:create', (roomData) => {
    if (!socket.user) {
      socket.emit('room:error', { message: 'Please login first' });
      return;
    }

    const room = dataStore.createChatRoom({
      name: roomData.name,
      password: roomData.password,
      maxUsers: roomData.maxUsers || 10,
      creator: socket.user.username
    });

    console.log(`🏠 Chat room created: ${room.name} by ${socket.user.username}`);
    
    // 생성자에게 성공 알림
    socket.emit('room:created', { room });
    
    // 모든 클라이언트에게 업데이트된 룸 리스트 전송
    chatNamespace.emit('rooms:list', dataStore.getAllChatRooms());
  });

  // 채팅룸 참여
  socket.on('room:join', (joinData) => {
    if (!socket.user) {
      socket.emit('room:error', { message: 'Please login first' });
      return;
    }

    const result = dataStore.joinChatRoom(joinData.roomId, socket.id, joinData.password);
    
    if (!result.success) {
      socket.emit('room:error', { message: result.message });
      return;
    }

    // 룸에 참여
    socket.join(joinData.roomId);
    socket.currentRoom = joinData.roomId;
    
    // 기존 메시지 전송
    const messages = dataStore.getChatMessages(joinData.roomId);
    socket.emit('chat:messages', messages);
    
    // 룸 정보 전송
    socket.emit('chat:room_joined', { room: result.room });
    
    // 다른 사용자들에게 참여 알림
    socket.to(joinData.roomId).emit('chat:user_joined', {
      message: `${socket.user.username}님이 입장했습니다.`,
      user: socket.user
    });

    // 업데이트된 룸 리스트 전송
    chatNamespace.emit('rooms:list', dataStore.getAllChatRooms());
    
    console.log(`🚪 ${socket.user.username} joined chat room: ${result.room.name}`);
  });

  // 채팅 메시지 전송
  socket.on('chat:message', (messageData) => {
    if (!socket.user || !socket.currentRoom) {
      socket.emit('chat:error', { message: 'Not in a room' });
      return;
    }

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: socket.user.id,
      username: socket.user.username,
      message: messageData.message,
      timestamp: new Date().toISOString(),
      type: messageData.type || 'text',
      fileUrl: messageData.fileUrl,
      fileSize: messageData.fileSize
    };

    // 메시지 저장
    dataStore.addChatMessage(socket.currentRoom, message);
    
    // 룸의 모든 사용자에게 메시지 전송
    chatNamespace.to(socket.currentRoom).emit('chat:new_message', message);
    
    // 업데이트된 룸 리스트 전송 (마지막 메시지 업데이트)
    chatNamespace.emit('rooms:list', dataStore.getAllChatRooms());
    
    console.log(`💬 Chat message from ${socket.user.username}: ${messageData.message}`);
  });

  // 파일 업로드 완료 알림
  socket.on('file:uploaded', (fileData) => {
    if (!socket.user || !socket.currentRoom) return;

    const message = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: socket.user.id,
      username: socket.user.username,
      message: fileData.originalName,
      timestamp: new Date().toISOString(),
      type: fileData.type,
      fileUrl: fileData.url,
      fileSize: fileData.size
    };

    dataStore.addChatMessage(socket.currentRoom, message);
    chatNamespace.to(socket.currentRoom).emit('chat:new_message', message);
    chatNamespace.emit('rooms:list', dataStore.getAllChatRooms());
    
    console.log(`📎 File uploaded in chat: ${fileData.originalName}`);
  });

  // 연결 해제
  socket.on('disconnect', () => {
    if (socket.user && socket.currentRoom) {
      dataStore.leaveChatRoom(socket.currentRoom, socket.id);
      socket.to(socket.currentRoom).emit('chat:user_left', {
        message: `${socket.user.username}님이 퇴장했습니다.`,
        user: socket.user
      });
      chatNamespace.emit('rooms:list', dataStore.getAllChatRooms());
    }
    
    if (socket.user) {
      dataStore.removeUser(socket.id);
    }
    
    console.log(`🗨️ Chat user disconnected: ${socket.id}`);
  });
});

// 🎵 PROJECT/MUSIC 네임스페이스
const projectNamespace = io.of('/project');
projectNamespace.on('connection', (socket) => {
  console.log(`🎵 Project user connected: ${socket.id}`);

  // 사용자 로그인
  socket.on('user:login', (userData) => {
    const user = {
      id: socket.id,
      username: userData.username,
      role: userData.role || 'MEMBER',
      namespace: 'project'
    };
    
    dataStore.addUser(socket.id, user);
    socket.user = user;
    
    console.log(`👤 Project user logged in: ${user.username}`);
    socket.emit('user:login_success', { user, connectedUsers: dataStore.getAllUsers().length });
    
    // 모든 뮤직룸 목록 전송
    socket.emit('rooms:list', dataStore.getAllMusicRooms());
  });

  // 뮤직룸 생성
  socket.on('room:create', (roomData) => {
    if (!socket.user) {
      socket.emit('room:error', { message: 'Please login first' });
      return;
    }

    const room = dataStore.createMusicRoom({
      name: roomData.name,
      description: roomData.description || '',
      password: roomData.password,
      maxUsers: roomData.maxUsers || 10,
      creator: socket.user.username,
      tech: roomData.tech || []
    });

    console.log(`🎵 Music room created: ${room.name} by ${socket.user.username}`);
    
    socket.emit('room:created', { room });
    projectNamespace.emit('rooms:list', dataStore.getAllMusicRooms());
  });

  // 뮤직룸 참여
  socket.on('room:join', (joinData) => {
    if (!socket.user) {
      socket.emit('room:error', { message: 'Please login first' });
      return;
    }

    const result = dataStore.joinMusicRoom(joinData.roomId, socket.id, joinData.password);
    
    if (!result.success) {
      socket.emit('room:error', { message: result.message });
      return;
    }

    socket.join(joinData.roomId);
    socket.currentRoom = joinData.roomId;
    
    const comments = dataStore.getMusicComments(joinData.roomId);
    socket.emit('music:room_joined', { 
      room: result.room,
      comments: comments
    });
    
    socket.to(joinData.roomId).emit('music:user_joined', {
      message: `${socket.user.username}님이 참여했습니다.`,
      user: socket.user
    });

    projectNamespace.emit('rooms:list', dataStore.getAllMusicRooms());
    console.log(`🎵 ${socket.user.username} joined music room: ${result.room.name}`);
  });

  // 음악 업로드 (기존 이벤트명 유지)
  socket.on('music uploaded', (data) => {
    if (!socket.currentRoom) return;
    
    const room = dataStore.getMusicRoom(socket.currentRoom);
    if (room) {
      room.currentTrack = {
        filename: data.musicData.filename,
        originalName: data.musicData.originalname,
        url: data.musicData.url,
        uploader: socket.user.username
      };
      
      projectNamespace.to(socket.currentRoom).emit('music uploaded', {
        track: room.currentTrack,
        uploader: socket.user.username
      });
      
      console.log(`🎵 Music uploaded: ${data.musicData.originalname}`);
    }
  });

  // 플레이백 토글 (기존 이벤트명 유지)
  socket.on('toggle playback', (data) => {
    if (!socket.currentRoom) return;
    
    const room = dataStore.getMusicRoom(socket.currentRoom);
    if (room) {
      room.isPlaying = !room.isPlaying;
      socket.to(socket.currentRoom).emit('playback toggled', {
        isPlaying: room.isPlaying,
        user: socket.user.username
      });
      
      console.log(`🎵 Playback toggled by ${socket.user.username}: ${room.isPlaying}`);
    }
  });

  // 음악 채팅 (기존 이벤트명 유지)
  socket.on('music chat message', (data) => {
    if (!socket.currentRoom) return;
    
    const comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user: socket.user.username,
      message: data.message,
      timestamp: data.timestamp || 0,
      time: new Date().toISOString()
    };
    
    dataStore.addMusicComment(socket.currentRoom, comment);
    
    projectNamespace.to(socket.currentRoom).emit('music chat message', comment);
    console.log(`💬 Music comment from ${socket.user.username}: ${data.message}`);
  });

  // 연결 해제
  socket.on('disconnect', () => {
    if (socket.user && socket.currentRoom) {
      dataStore.leaveMusicRoom(socket.currentRoom, socket.id);
      socket.to(socket.currentRoom).emit('music:user_left', {
        message: `${socket.user.username}님이 퇴장했습니다.`,
        user: socket.user
      });
      projectNamespace.emit('rooms:list', dataStore.getAllMusicRooms());
    }
    
    if (socket.user) {
      dataStore.removeUser(socket.id);
    }
    
    console.log(`🎵 Project user disconnected: ${socket.id}`);
  });
});

// ===== 에러 핸들링 =====
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '파일 크기가 너무 큽니다 (최대 50MB)' });
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
╔═══════════════════════════════════════╗
║           🚀 VLYNK SERVER v3.0        ║
║          Professional Edition         ║
╠═══════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(31)} ║
║  Status: ✅ Running                   ║
║  Chat Namespace: ✅ /chat             ║
║  Project Namespace: ✅ /project       ║
║  File Upload: ✅ Ready                ║
╚═══════════════════════════════════════╝

🎯 Namespaced Features:
   • /chat - Real-time Chat Rooms
   • /project - Music Collaboration Rooms
   • Professional File Upload System
   • Separated Data Management
   
🔗 API Endpoints:
   • Main: http://localhost:${PORT}
   • Health: http://localhost:${PORT}/health
   • Chat Upload: POST /api/upload/chat
   • Music Upload: POST /api/upload/music
   • Voice Upload: POST /api/upload/voice
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