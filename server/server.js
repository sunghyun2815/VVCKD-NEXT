require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// ===== 환경 변수 설정 =====
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ===== Express 앱 초기화 =====
const app = express();
const server = http.createServer(app);

// ===== 보안 및 성능 미들웨어 =====
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// ===== CORS 설정 =====
const corsOptions = {
  origin: [CLIENT_URL, 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===== Socket.IO 설정 =====
const io = socketIo(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 50 * 1024 * 1024, // 50MB
  transports: ['websocket', 'polling']
});

// ===== 디렉토리 구조 생성 =====
const createDirectories = () => {
  const directories = [
    'uploads',
    'uploads/music',
    'uploads/voice',
    'uploads/chat',
    'logs'
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

// ===== 데이터 저장소 (메모리) =====
class DataStore {
  constructor() {
    // 채팅룸 관련
    this.chatRooms = new Map();
    this.chatMessages = new Map();
    
    // 음악룸 관련
    this.musicRooms = new Map();
    this.musicMessages = new Map();
    this.audioFiles = new Map();
    
    // 사용자 관련
    this.connectedUsers = new Map();
    this.userSessions = new Map();
  }

  // 채팅룸 메서드
  createChatRoom(roomId, roomData) {
    this.chatRooms.set(roomId, {
      id: roomId,
      name: roomData.name || `Chat Room ${roomId}`,
      createdAt: new Date().toISOString(),
      participants: new Set(),
      ...roomData
    });
    this.chatMessages.set(roomId, []);
    return this.chatRooms.get(roomId);
  }

  getChatRoom(roomId) {
    return this.chatRooms.get(roomId);
  }

  addChatMessage(roomId, message) {
    if (!this.chatMessages.has(roomId)) {
      this.chatMessages.set(roomId, []);
    }
    const messageData = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...message
    };
    this.chatMessages.get(roomId).push(messageData);
    return messageData;
  }

  getChatMessages(roomId, limit = 50) {
    const messages = this.chatMessages.get(roomId) || [];
    return messages.slice(-limit);
  }

  // 음악룸 메서드
  createMusicRoom(roomId, roomData) {
    this.musicRooms.set(roomId, {
      id: roomId,
      name: roomData.name || `Music Room ${roomId}`,
      createdAt: new Date().toISOString(),
      participants: new Set(),
      currentTrack: null,
      isPlaying: false,
      ...roomData
    });
    this.musicMessages.set(roomId, []);
    return this.musicRooms.get(roomId);
  }

  getMusicRoom(roomId) {
    return this.musicRooms.get(roomId);
  }

  // 사용자 메서드
  addUser(socketId, userData) {
    this.connectedUsers.set(socketId, {
      id: socketId,
      joinedAt: new Date().toISOString(),
      ...userData
    });
    return this.connectedUsers.get(socketId);
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
}

const dataStore = new DataStore();

// ===== 기본 라우트 =====
app.get('/', (req, res) => {
  res.json({
    service: '🚀 VLYNK Server',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    features: [
      'Socket.IO Real-time Communication',
      'Chat Rooms',
      'Music Rooms', 
      'File Upload/Streaming',
      'Professional Architecture'
    ],
    endpoints: {
      health: '/health',
      upload: '/api/upload',
      stream: '/api/stream/:filename',
      download: '/api/download/:filename'
    },
    stats: {
      connectedUsers: dataStore.getAllUsers().length,
      chatRooms: dataStore.chatRooms.size,
      musicRooms: dataStore.musicRooms.size
    }
  });
});

// ===== 헬스 체크 =====
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version
  });
});

// ===== 정적 파일 제공 =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    // 오디오 파일에 대한 적절한 헤더 설정
    if (path.includes('/music/') || path.includes('/voice/')) {
      res.set('Accept-Ranges', 'bytes');
      res.set('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// ===== Multer 파일 업로드 설정 =====
const multer = require('multer');

// 파일 저장소 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = path.join(__dirname, 'uploads');
    
    // 파일 타입에 따라 폴더 분류
    if (file.fieldname === 'music') {
      uploadPath = path.join(__dirname, 'uploads/music');
    } else if (file.fieldname === 'voice') {
      uploadPath = path.join(__dirname, 'uploads/voice');
    } else if (file.fieldname === 'chat') {
      uploadPath = path.join(__dirname, 'uploads/chat');
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // 안전한 파일명 생성
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

// 파일 타입 검증
const fileFilter = (req, file, cb) => {
  const allowedAudioTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
    'audio/webm', 'audio/aac', 'audio/flac', 'audio/mp4'
  ];
  
  const allowedImageTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
  ];
  
  const allowedVideoTypes = [
    'video/mp4', 'video/webm'
  ];
  
  const allowedDocTypes = [
    'application/pdf', 'text/plain'
  ];
  
  const allAllowedTypes = [
    ...allowedAudioTypes,
    ...allowedImageTypes,
    ...allowedVideoTypes,
    ...allowedDocTypes
  ];
  
  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`지원하지 않는 파일 형식입니다: ${file.mimetype}`), false);
  }
};

// Multer 설정
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 5
  },
  fileFilter: fileFilter
});

// 파일 업로드 에러 핸들링
const handleUploadError = (error, req, res, next) => {
  console.error('📤 Upload Error:', error);

  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: '파일 크기가 너무 큽니다. (최대 100MB)'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: '파일 개수 제한을 초과했습니다. (최대 5개)'
        });
      default:
        return res.status(400).json({
          success: false,
          error: '파일 업로드 오류가 발생했습니다.'
        });
    }
  }

  if (error.message.includes('지원하지 않는 파일 형식')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  return res.status(500).json({
    success: false,
    error: '서버 내부 오류가 발생했습니다.'
  });
};

// ===== 파일 업로드 라우트 =====

// 음악 파일 업로드
app.post('/api/upload/music', (req, res) => {
  upload.array('music', 5)(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res);
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: '업로드할 음악 파일이 없습니다.'
      });
    }

    const fileResponses = req.files.map(file => ({
      id: Date.now().toString(),
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      url: `/uploads/music/${file.filename}`,
      streamUrl: `/api/stream/music/${file.filename}`,
      downloadUrl: `/api/download/music/${file.filename}`,
      uploadedAt: new Date().toISOString()
    }));

    console.log(`🎵 Music uploaded: ${req.files.length} files`);

    res.json({
      success: true,
      message: `${req.files.length}개의 음악 파일이 성공적으로 업로드되었습니다.`,
      data: fileResponses
    });
  });
});

// 음성 파일 업로드
app.post('/api/upload/voice', (req, res) => {
  upload.single('voice')(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res);
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '업로드할 음성 파일이 없습니다.'
      });
    }

    const fileResponse = {
      id: Date.now().toString(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: `/uploads/voice/${req.file.filename}`,
      streamUrl: `/api/stream/voice/${req.file.filename}`,
      downloadUrl: `/api/download/voice/${req.file.filename}`,
      uploadedAt: new Date().toISOString()
    };

    console.log(`🎤 Voice uploaded: ${req.file.originalname}`);

    res.json({
      success: true,
      message: '음성 파일이 성공적으로 업로드되었습니다.',
      data: fileResponse
    });
  });
});

// 채팅 파일 업로드
app.post('/api/upload/chat', (req, res) => {
  upload.array('files', 3)(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res);
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: '업로드할 파일이 없습니다.'
      });
    }

    const fileResponses = req.files.map(file => ({
      id: Date.now().toString(),
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      url: `/uploads/chat/${file.filename}`,
      streamUrl: `/api/stream/chat/${file.filename}`,
      downloadUrl: `/api/download/chat/${file.filename}`,
      uploadedAt: new Date().toISOString()
    }));

    console.log(`💬 Chat files uploaded: ${req.files.length} files`);

    res.json({
      success: true,
      message: `${req.files.length}개의 파일이 성공적으로 업로드되었습니다.`,
      data: fileResponses
    });
  });
});

// 파일 스트리밍
app.get('/api/stream/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const validTypes = ['music', 'voice', 'chat'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: '잘못된 파일 타입입니다.'
    });
  }

  const filePath = path.join(__dirname, 'uploads', type, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: '파일을 찾을 수 없습니다.'
    });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Range 요청 처리 (스트리밍)
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/mpeg',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    // 전체 파일 전송
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
    };

    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }

  console.log(`📡 Streaming ${type}: ${filename}`);
});

// 파일 다운로드
app.get('/api/download/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const validTypes = ['music', 'voice', 'chat'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: '잘못된 파일 타입입니다.'
    });
  }

  const filePath = path.join(__dirname, 'uploads', type, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: '파일을 찾을 수 없습니다.'
    });
  }

  // 원본 파일명 추출
  const parts = filename.split('_');
  const originalName = parts.slice(2).join('_');

  res.download(filePath, originalName, (err) => {
    if (err) {
      console.error('📥 Download Error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: '파일 다운로드 중 오류가 발생했습니다.'
        });
      }
    } else {
      console.log(`📥 Downloaded ${type}: ${filename}`);
    }
  });
});

// 파일 목록 조회
app.get('/api/files/:type', (req, res) => {
  const { type } = req.params;
  const validTypes = ['music', 'voice', 'chat'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: '잘못된 파일 타입입니다.'
    });
  }

  const dirPath = path.join(__dirname, 'uploads', type);

  if (!fs.existsSync(dirPath)) {
    return res.json({
      success: true,
      data: []
    });
  }

  try {
    const files = fs.readdirSync(dirPath).map(filename => {
      const filePath = path.join(dirPath, filename);
      const stats = fs.statSync(filePath);
      
      // 파일명에서 원본명 추출
      const parts = filename.split('_');
      const originalName = parts.slice(2).join('_');

      return {
        filename,
        originalName,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        url: `/uploads/${type}/${filename}`,
        streamUrl: `/api/stream/${type}/${filename}`,
        downloadUrl: `/api/download/${type}/${filename}`
      };
    });

    res.json({
      success: true,
      data: files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });

  } catch (error) {
    console.error('📂 File listing error:', error);
    res.status(500).json({
      error: '파일 목록을 가져오는 중 오류가 발생했습니다.'
    });
  }
});

// 파일 삭제
app.delete('/api/files/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const validTypes = ['music', 'voice', 'chat'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: '잘못된 파일 타입입니다.'
    });
  }

  const filePath = path.join(__dirname, 'uploads', type, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: '파일을 찾을 수 없습니다.'
    });
  }

  try {
    fs.unlinkSync(filePath);
    
    console.log(`🗑️ Deleted ${type}: ${filename}`);
    
    res.json({
      success: true,
      message: '파일이 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('🗑️ Delete error:', error);
    res.status(500).json({
      error: '파일 삭제 중 오류가 발생했습니다.'
    });
  }
});

// ===== Socket.IO 이벤트 핸들러 =====
io.on('connection', (socket) => {
  console.log(`🔗 User connected: ${socket.id}`);

  // 사용자 등록
  socket.on('user:register', (userData) => {
    dataStore.addUser(socket.id, userData);
    socket.emit('user:registered', {
      id: socket.id,
      ...userData
    });
    
    // 모든 클라이언트에게 사용자 목록 업데이트 전송
    io.emit('users:updated', dataStore.getAllUsers());
  });

  // === 채팅룸 이벤트 ===
  socket.on('chat:join', (roomId) => {
    socket.join(`chat_${roomId}`);
    
    // 방이 없으면 생성
    if (!dataStore.getChatRoom(roomId)) {
      dataStore.createChatRoom(roomId, { name: `Chat Room ${roomId}` });
    }

    const room = dataStore.getChatRoom(roomId);
    room.participants.add(socket.id);

    // 최근 메시지 전송
    const recentMessages = dataStore.getChatMessages(roomId);
    socket.emit('chat:messages', recentMessages);
    
    // 방 참가 알림
    socket.to(`chat_${roomId}`).emit('chat:user_joined', {
      userId: socket.id,
      user: dataStore.getUser(socket.id)
    });

    console.log(`💬 User ${socket.id} joined chat room: ${roomId}`);
  });

  socket.on('chat:message', (data) => {
    const { roomId, message, type = 'text' } = data;
    
    const messageData = dataStore.addChatMessage(roomId, {
      userId: socket.id,
      user: dataStore.getUser(socket.id),
      message,
      type
    });

    // 같은 방의 모든 사용자에게 메시지 전송
    io.to(`chat_${roomId}`).emit('chat:new_message', messageData);
    
    console.log(`💬 Message in room ${roomId}:`, message);
  });

  socket.on('chat:leave', (roomId) => {
    socket.leave(`chat_${roomId}`);
    
    const room = dataStore.getChatRoom(roomId);
    if (room) {
      room.participants.delete(socket.id);
    }

    socket.to(`chat_${roomId}`).emit('chat:user_left', {
      userId: socket.id,
      user: dataStore.getUser(socket.id)
    });

    console.log(`💬 User ${socket.id} left chat room: ${roomId}`);
  });

  // === 음악룸 이벤트 ===
  socket.on('music:join', (roomId) => {
    socket.join(`music_${roomId}`);
    
    // 방이 없으면 생성
    if (!dataStore.getMusicRoom(roomId)) {
      dataStore.createMusicRoom(roomId, { name: `Music Room ${roomId}` });
    }

    const room = dataStore.getMusicRoom(roomId);
    room.participants.add(socket.id);

    // 현재 재생 중인 트랙 정보 전송
    socket.emit('music:room_state', {
      currentTrack: room.currentTrack,
      isPlaying: room.isPlaying,
      participants: Array.from(room.participants)
    });

    socket.to(`music_${roomId}`).emit('music:user_joined', {
      userId: socket.id,
      user: dataStore.getUser(socket.id)
    });

    console.log(`🎵 User ${socket.id} joined music room: ${roomId}`);
  });

  socket.on('music:play', (data) => {
    const { roomId, track } = data;
    const room = dataStore.getMusicRoom(roomId);
    
    if (room) {
      room.currentTrack = track;
      room.isPlaying = true;
      
      // 같은 방의 모든 사용자에게 재생 시작 알림
      io.to(`music_${roomId}`).emit('music:track_started', {
        track,
        startedBy: dataStore.getUser(socket.id)
      });
    }

    console.log(`🎵 Playing in room ${roomId}:`, track?.name);
  });

  socket.on('music:pause', (roomId) => {
    const room = dataStore.getMusicRoom(roomId);
    if (room) {
      room.isPlaying = false;
      io.to(`music_${roomId}`).emit('music:track_paused');
    }
  });

  socket.on('music:stop', (roomId) => {
    const room = dataStore.getMusicRoom(roomId);
    if (room) {
      room.currentTrack = null;
      room.isPlaying = false;
      io.to(`music_${roomId}`).emit('music:track_stopped');
    }
  });

  // === 연결 해제 ===
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    
    // 사용자 제거
    dataStore.removeUser(socket.id);
    
    // 모든 방에서 사용자 제거
    dataStore.chatRooms.forEach((room, roomId) => {
      if (room.participants.has(socket.id)) {
        room.participants.delete(socket.id);
        socket.to(`chat_${roomId}`).emit('chat:user_left', {
          userId: socket.id
        });
      }
    });

    dataStore.musicRooms.forEach((room, roomId) => {
      if (room.participants.has(socket.id)) {
        room.participants.delete(socket.id);
        socket.to(`music_${roomId}`).emit('music:user_left', {
          userId: socket.id
        });
      }
    });

    // 사용자 목록 업데이트
    io.emit('users:updated', dataStore.getAllUsers());
  });

  // === 에러 핸들링 ===
  socket.on('error', (error) => {
    console.error(`❌ Socket error from ${socket.id}:`, error);
  });
});

// ===== 에러 핸들링 미들웨어 =====
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err);
  
  res.status(err.status || 500).json({
    error: {
      message: NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
      status: err.status || 500,
      timestamp: new Date().toISOString()
    }
  });
});

// ===== 404 핸들러 =====
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
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║           🚀 VLYNK SERVER            ║
║              v2.0.0                  ║
╠══════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(30)} ║
║  Environment: ${NODE_ENV.padEnd(23)} ║
║  Client URL: ${CLIENT_URL.padEnd(22)} ║
║  Status: ✅ Running                  ║
╚══════════════════════════════════════╝
`);

  console.log(`
🔗 Endpoints:
   • Main: http://localhost:${PORT}
   • Health: http://localhost:${PORT}/health
   • Uploads: http://localhost:${PORT}/uploads
   
🎯 Features Active:
   • Socket.IO Real-time Communication
   • Chat Rooms with persistent messages
   • Music Rooms with synchronized playback
   • File upload and streaming
   • Professional error handling
   • Security middleware (Helmet)
   • Request compression
   • Access logging
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