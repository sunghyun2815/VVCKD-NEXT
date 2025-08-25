const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

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

// ===== Multer 파일 업로드 설정 =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = path.join(__dirname, 'uploads');
    
    // 필드명에 따라 폴더 분류
    if (file.fieldname === 'music') {
      uploadPath = path.join(__dirname, 'uploads/music');
    } else if (file.fieldname === 'voice') {
      uploadPath = path.join(__dirname, 'uploads/voice');
    } else {
      // 기본적으로 chat 폴더에 저장
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
  const allowedTypes = [
    // 이미지
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // 오디오
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 
    'audio/aac', 'audio/flac', 'audio/mp4',
    // 비디오
    'video/mp4', 'video/webm', 'video/quicktime',
    // 문서
    'application/pdf', 'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
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
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: '예상하지 못한 파일 필드입니다.'
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
    version: '2.2.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    features: [
      'Socket.IO Real-time Communication',
      'Chat Rooms',
      'User Management',
      'File Upload & Streaming',
      'Multimedia Chat Support'
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // 파일 타입에 따른 적절한 헤더 설정
    if (filePath.includes('/music/') || filePath.includes('/chat/')) {
      res.set('Accept-Ranges', 'bytes');
      res.set('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// ===== 파일 업로드 API 라우트 =====

// 채팅 파일 업로드
app.post('/api/upload/chat', (req, res) => {
  upload.array('files', 5)(req, res, (err) => {
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
      type: file.mimetype.startsWith('image/') ? 'image' : 
            file.mimetype.startsWith('audio/') ? 'audio' : 
            file.mimetype.startsWith('video/') ? 'video' : 'file',
      url: `/uploads/chat/${file.filename}`,
      streamUrl: `/api/stream/chat/${file.filename}`,
      downloadUrl: `/api/download/chat/${file.filename}`,
      uploadedAt: new Date().toISOString()
    }));

    console.log(`📎 Chat files uploaded: ${req.files.length} files`);

    res.json({
      success: true,
      message: `${req.files.length}개의 파일이 성공적으로 업로드되었습니다.`,
      data: fileResponses
    });
  });
});

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
      type: 'audio',
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
      type: 'voice',
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

// ===== 파일 스트리밍 API =====
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

  // MIME 타입 설정
  const ext = path.extname(filename).toLowerCase();
  let contentType = 'application/octet-stream';
  
  if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.gif') contentType = 'image/gif';
  else if (ext === '.webp') contentType = 'image/webp';
  else if (['.mp3', '.mpeg'].includes(ext)) contentType = 'audio/mpeg';
  else if (ext === '.wav') contentType = 'audio/wav';
  else if (ext === '.ogg') contentType = 'audio/ogg';
  else if (ext === '.aac') contentType = 'audio/aac';
  else if (ext === '.flac') contentType = 'audio/flac';
  else if (ext === '.mp4') contentType = 'video/mp4';
  else if (ext === '.webm') contentType = 'video/webm';

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
      'Content-Type': contentType,
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    // 전체 파일 전송
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    };

    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }

  console.log(`📡 Streaming ${type}: ${filename}`);
});

// ===== 파일 다운로드 API =====
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

// ===== 파일 목록 조회 API =====
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
    const { roomId, message, type = 'text', fileUrl, fileSize, originalName } = data;
    const user = dataStore.getUser(socket.id);
    
    if (!roomId || (!message && !fileUrl)) {
      socket.emit('chat:error', { message: '메시지 데이터가 올바르지 않습니다.' });
      return;
    }

    const messageData = dataStore.addChatMessage(roomId, {
      userId: socket.id,
      username: user?.username || 'Anonymous',
      message: message || originalName || 'File',
      type: type,
      fileUrl: fileUrl,
      fileSize: fileSize
    });

    // 같은 방의 모든 사용자에게 메시지 전송 (본인 포함)
    io.to(`chat_${roomId}`).emit('chat:new_message', messageData);
    
    console.log(`💬 Message in room ${roomId}: ${type === 'text' ? message : `[${type}] ${originalName || message}`}`);
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
║              v2.2.0                  ║
╠══════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(30)} ║
║  Status: ✅ Running                  ║
║  Socket.IO: ✅ Active                ║
║  File Upload: ✅ Ready               ║
╚══════════════════════════════════════╝

🎯 Features Available:
   • Socket.IO Real-time Communication
   • Chat Rooms with persistent messages
   • User management and presence
   • File Upload & Streaming (Images, Audio, Video)
   • Multimedia Chat Support
   
🔗 API Endpoints:
   • Main: http://localhost:${PORT}
   • Health: http://localhost:${PORT}/health
   • Upload Chat: POST /api/upload/chat
   • Upload Music: POST /api/upload/music
   • Upload Voice: POST /api/upload/voice
   • Stream Files: GET /api/stream/:type/:filename
   • Download Files: GET /api/download/:type/:filename
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