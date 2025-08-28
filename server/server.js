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
    let type = 'voice';
    
    if (req.path.includes('/chat') || req.url.includes('/chat')) {
      type = 'chat';
    } else if (req.path.includes('/music') || req.url.includes('/music')) {
      type = 'music';
    } else if (req.path.includes('/voice') || req.url.includes('/voice')) {
      type = 'voice';
    }
    
    console.log(`📁 File destination: ${type} (from ${req.path})`);
    cb(null, `uploads/${type}/`);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    
    // 파일명을 안전하게 처리 (한글 및 특수문자 처리)
    const originalName = path.basename(file.originalname, ext);
    const safeName = originalName
      .replace(/[^\w\s-가-힣]/g, '') // 영문, 숫자, 공백, 하이픈, 한글만 허용
      .replace(/\s+/g, '_') // 공백을 언더스코어로 변경
      .substring(0, 50); // 길이 제한
    
    const finalName = `${timestamp}_${safeName}${ext}`;
    console.log(`📝 Generated filename: ${file.originalname} -> ${finalName}`);
    
    cb(null, finalName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    console.log('🔍 File check:', {
      name: file.originalname,
      mime: file.mimetype,
      path: req.path
    });

    // 위험한 파일 확장자만 차단
    const dangerousExtensions = /\.(exe|bat|cmd|scr|pif|com|vbs|jar)$/i;
    
    if (dangerousExtensions.test(file.originalname)) {
      console.error('❌ Dangerous file blocked:', file.originalname);
      return cb(new Error('보안상 위험한 파일 형식입니다.'));
    }
    
    // 나머지는 모두 허용
    console.log('✅ File accepted:', file.originalname);
    return cb(null, true);
  }
});

// ===== 데이터 저장소 클래스 =====
class DataStore {
  constructor() {
    this.users = new Map();
    this.chatRooms = new Map();
    this.musicRooms = new Map();
    this.chatMessages = new Map();
    this.musicComments = new Map();
  }

  // 사용자 관리
  addUser(socketId, user) {
    this.users.set(socketId, user);
  }

  removeUser(socketId) {
    this.users.delete(socketId);
  }

  getUser(socketId) {
    return this.users.get(socketId);
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  // 채팅룸 관리
  createChatRoom(roomData) {
    const roomId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const room = {
      id: roomId,
      ...roomData,
      users: new Set(),
      messages: [],
      createdAt: new Date().toISOString(),
      type: 'chat'
    };
    
    this.chatRooms.set(roomId, room);
    return room;
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
      lastMessage: room.lastMessage || '',
      lastMessageTime: room.lastMessageTime || 0,
      type: 'chat'
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

  // 뮤직룸 관리
  createMusicRoom(roomData) {
    const roomId = `music_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const room = {
      id: roomId,
      ...roomData,
      users: new Set(),
      currentTrack: null,
      isPlaying: false,
      createdAt: new Date().toISOString(),
      type: 'music'
    };
    
    this.musicRooms.set(roomId, room);
    return room;
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
  console.log('🎵 Music file uploaded:', req.file.filename);
  
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

// ===== 파일 제공 및 다운로드 (CORS 헤더 추가) =====
app.get('/api/files/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const filePath = path.join(__dirname, 'uploads', type, filename);

  console.log('📁 File request:', filePath);

  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath);
    return res.status(404).json({ error: 'File not found' });
  }

  // CORS 헤더 추가
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  
  // 파일 타입에 따른 Content-Type 설정
  const ext = path.extname(filename).toLowerCase();
  let contentType = 'application/octet-stream';
  
  switch(ext) {
    case '.mp3':
      contentType = 'audio/mpeg';
      break;
    case '.wav':
      contentType = 'audio/wav';
      break;
    case '.ogg':
      contentType = 'audio/ogg';
      break;
    case '.m4a':
      contentType = 'audio/mp4';
      break;
    case '.flac':
      contentType = 'audio/flac';
      break;
    case '.webm':
      contentType = 'audio/webm';
      break;
    case '.jpg':
    case '.jpeg':
      contentType = 'image/jpeg';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.gif':
      contentType = 'image/gif';
      break;
    case '.mp4':
      contentType = 'video/mp4';
      break;
    default:
      contentType = 'application/octet-stream';
  }
  
  res.header('Content-Type', contentType);
  res.header('Accept-Ranges', 'bytes');
  res.header('Cache-Control', 'public, max-age=3600');
  
  console.log('✅ Serving file:', filename, 'as', contentType);
  res.sendFile(filePath);
});

// OPTIONS 핸들러 추가 (CORS preflight)
app.options('/api/files/:type/:filename', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.sendStatus(200);
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

  // 룸 생성
  socket.on('room:create', (roomData) => {
    if (!socket.user) return;
    
    const room = dataStore.createChatRoom({
      ...roomData,
      creator: socket.user.username
    });
    
    console.log(`🏠 Chat room created: ${room.name} by ${socket.user.username}`);
    chatNamespace.emit('rooms:list', dataStore.getAllChatRooms());
    socket.emit('room:created', { room });
  });

  // 룸 참여
  socket.on('room:join', (joinData) => {
    if (!socket.user) return;
    
    const result = dataStore.joinChatRoom(joinData.roomId, socket.id, joinData.password);
    if (result.success) {
      socket.join(joinData.roomId);
      socket.currentRoom = joinData.roomId;
      
      socket.emit('room:joined', { 
        room: result.room,
        messages: result.room.messages || []
      });
      
      socket.to(joinData.roomId).emit('chat:user_joined', {
        message: `${socket.user.username}님이 입장했습니다.`,
        user: socket.user
      });
      
      chatNamespace.emit('rooms:list', dataStore.getAllChatRooms());
      console.log(`🚪 ${socket.user.username} joined chat room: ${result.room.name}`);
    } else {
      socket.emit('room:error', { message: result.message });
    }
  });

  // 메시지 전송
  socket.on('chat:message', (messageData) => {
    if (!socket.user || !socket.currentRoom) return;
    
    const room = dataStore.getChatRoom(socket.currentRoom);
    if (!room) return;
    
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: socket.id,
      username: socket.user.username,
      message: messageData.message,
      timestamp: new Date().toISOString(),
      type: messageData.type || 'text',
      fileUrl: messageData.fileUrl,
      fileSize: messageData.fileSize
    };
    
    room.messages.push(message);
    room.lastMessage = messageData.message;
    room.lastMessageTime = Date.now();
    
    chatNamespace.to(socket.currentRoom).emit('chat:message', message);
    chatNamespace.emit('rooms:list', dataStore.getAllChatRooms());
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

// 🎵 PROJECT 네임스페이스
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

  // 룸 생성
  socket.on('room:create', (roomData) => {
    if (!socket.user) return;
    
    const room = dataStore.createMusicRoom({
      ...roomData,
      creator: socket.user.username
    });
    
    console.log(`🎵 Music room created: ${room.name} by ${socket.user.username}`);
    projectNamespace.emit('rooms:list', dataStore.getAllMusicRooms());
    socket.emit('room:created', { room });
  });

  // 룸 참여
  socket.on('room:join', (joinData) => {
    if (!socket.user) return;
    
    const result = dataStore.joinMusicRoom(joinData.roomId, socket.id, joinData.password);
    if (result.success) {
      socket.join(joinData.roomId);
      socket.currentRoom = joinData.roomId;
      
      socket.emit('music:room_joined', { 
        room: result.room,
        comments: dataStore.getMusicComments(joinData.roomId)
      });
      
      socket.to(joinData.roomId).emit('music:user_joined', {
        message: `${socket.user.username}님이 입장했습니다.`,
        user: socket.user
      });
      
      projectNamespace.emit('rooms:list', dataStore.getAllMusicRooms());
      console.log(`🎵 ${socket.user.username} joined music room: ${result.room.name}`);
    } else {
      socket.emit('room:error', { message: result.message });
    }
  });

  // 음악 업로드 (기존 이벤트명 유지)
  socket.on('music uploaded', (data) => {
    if (!socket.currentRoom) return;
    
    const room = dataStore.getMusicRoom(socket.currentRoom);
    if (room) {
      const track = {
        originalName: data.musicData.originalname,
        filename: data.musicData.filename,
        url: data.musicData.url,
        uploader: socket.user.username,
        uploadedAt: new Date().toISOString()
      };
      
      room.currentTrack = track;
      
      // 룸의 모든 사용자에게 음악 업로드 알림
      projectNamespace.to(socket.currentRoom).emit('music uploaded', {
        track: track,
        uploader: socket.user.username
      });
      
      console.log(`🎵 Music uploaded: ${data.musicData.originalname} by ${socket.user.username}`);
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
      time: new Date().toISOString(),
      type: data.type || 'text',
      voiceUrl: data.voiceUrl
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
║  CORS: ✅ Configured                  ║
╚═══════════════════════════════════════╝

🎯 Namespaced Features:
   • /chat - Real-time Chat Rooms
   • /project - Music Collaboration Rooms
   • Professional File Upload System
   • Separated Data Management
   • Audio Streaming with CORS Support
   
🔗 API Endpoints:
   • Main: http://localhost:${PORT}
   • Health: http://localhost:${PORT}/health
   • Chat Upload: POST /api/upload/chat
   • Music Upload: POST /api/upload/music
   • Voice Upload: POST /api/upload/voice
   • File Serving: GET /api/files/:type/:filename
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