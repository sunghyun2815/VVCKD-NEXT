const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// ===== CORS 설정 =====
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===== Socket.IO 설정 =====
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 50 * 1024 * 1024 // 50MB
});

// ===== 디렉토리 생성 =====
const uploadsDir = path.join(__dirname, 'uploads');
const musicDir = path.join(__dirname, 'uploads', 'music');
const voiceDir = path.join(__dirname, 'uploads', 'voice');

[uploadsDir, musicDir, voiceDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// ===== Multer 설정 =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadsDir;
    
    if (file.fieldname === 'music') {
      uploadPath = musicDir;
    } else if (file.fieldname === 'voice') {
      uploadPath = voiceDir;
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 
      'audio/webm', 'audio/aac', 'audio/flac', 'audio/mp4'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`지원하지 않는 파일 형식입니다: ${file.mimetype}`), false);
    }
  }
});

// ===== 정적 파일 제공 =====
app.use('/uploads', express.static(uploadsDir));

// ===== 데이터 저장소 (메모리) =====
const musicRooms = new Map();
const connectedUsers = new Map();
const roomMessages = new Map();
const roomAudioFiles = new Map();

// ===== 기본 라우트 =====
app.get('/', (req, res) => {
  res.json({
    message: '🎵 VLYNK Music Room Server',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      upload: '/upload',
      stream: '/stream/:filename',
      download: '/download/:filename'
    }
  });
});

// ===== 파일 업로드 API =====
app.post('/upload', upload.single('music'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: '파일이 업로드되지 않았습니다.' 
      });
    }

    const fileInfo = {
      id: Date.now().toString(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      url: `/uploads/music/${req.file.filename}`,
      uploadedAt: new Date().toISOString(),
      uploader: req.body.uploader || 'Anonymous'
    };

    console.log('📤 File uploaded:', fileInfo.originalName);
    
    res.json({
      success: true,
      data: fileInfo
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      error: '파일 업로드 중 오류가 발생했습니다.'
    });
  }
});

// ===== 파일 스트리밍 API =====
app.get('/stream/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(musicDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // 범위 요청 처리 (스트리밍)
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
    // 전체 파일 제공
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'audio/mpeg',
    };
    
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// ===== 파일 다운로드 API =====
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(musicDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
  }

  res.download(filePath, (err) => {
    if (err) {
      console.error('❌ Download error:', err);
      res.status(500).json({ error: '다운로드 중 오류가 발생했습니다.' });
    }
  });
});

// ===== 파일 삭제 API =====
app.delete('/delete/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(musicDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('❌ Delete error:', err);
      return res.status(500).json({ error: '파일 삭제 중 오류가 발생했습니다.' });
    }
    
    console.log('🗑️ File deleted:', filename);
    res.json({ success: true, message: '파일이 삭제되었습니다.' });
  });
});

// ===== 헬퍼 함수들 =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function createDefaultRooms() {
  const defaultRooms = [
    {
      id: 'room-default-1',
      name: 'Lo-Fi Study Session',
      description: 'Chill beats for coding and studying',
      genres: ['lo-fi', 'chill', 'study'],
      maxUsers: 20,
      participants: 0,
      musicCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    },
    {
      id: 'room-default-2',
      name: 'Electronic Playground',
      description: 'Experimental electronic music collaboration',
      genres: ['electronic', 'experimental', 'techno'],
      maxUsers: 15,
      participants: 0,
      musicCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    },
    {
      id: 'room-default-3',
      name: 'Ambient Soundscapes',
      description: 'Creating atmospheric music together',
      genres: ['ambient', 'atmospheric', 'drone'],
      maxUsers: 10,
      participants: 0,
      musicCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system'
    }
  ];

  defaultRooms.forEach(room => {
    musicRooms.set(room.id, room);
    roomMessages.set(room.id, []);
    roomAudioFiles.set(room.id, []);
  });

  console.log('🏠 Default rooms created:', defaultRooms.length);
}

function getRoomList() {
  return Array.from(musicRooms.values());
}

function getUsersInRoom(roomId) {
  const users = [];
  connectedUsers.forEach((userData, socketId) => {
    if (userData.currentRoom === roomId) {
      users.push(userData);
    }
  });
  return users;
}

function broadcastToRoom(roomId, event, data) {
  const roomSockets = [];
  connectedUsers.forEach((userData, socketId) => {
    if (userData.currentRoom === roomId) {
      roomSockets.push(socketId);
    }
  });
  
  roomSockets.forEach(socketId => {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit(event, data);
    }
  });
}

// ===== Socket.IO 이벤트 처리 =====
io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // 사용자 데이터 초기화
  connectedUsers.set(socket.id, {
    id: socket.id,
    username: null,
    currentRoom: null,
    joinedAt: new Date().toISOString(),
    role: 'guest'
  });

  // ===== 사용자 관리 =====
  socket.on('user_join', (data) => {
    const { username } = data;
    
    const userData = connectedUsers.get(socket.id);
    if (userData) {
      userData.username = username;
      userData.role = 'user';
      connectedUsers.set(socket.id, userData);
    }

    console.log(`👤 User joined: ${username} (${socket.id})`);
    
    // 룸 목록 전송
    socket.emit('music_room_list', getRoomList());
  });

  socket.on('user_leave', () => {
    const userData = connectedUsers.get(socket.id);
    if (userData && userData.currentRoom) {
      handleLeaveRoom(socket, userData.currentRoom);
    }
    
    console.log(`👤 User left: ${userData?.username} (${socket.id})`);
  });

  // ===== 룸 관리 =====
  socket.on('get_music_room_list', () => {
    socket.emit('music_room_list', getRoomList());
  });

  socket.on('create_music_room', (roomData) => {
    const userData = connectedUsers.get(socket.id);
    if (!userData || !userData.username) {
      socket.emit('music_room_join_error', { message: '로그인이 필요합니다.' });
      return;
    }

    const newRoom = {
      id: generateId(),
      ...roomData,
      participants: 0,
      musicCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userData.username
    };

    musicRooms.set(newRoom.id, newRoom);
    roomMessages.set(newRoom.id, []);
    roomAudioFiles.set(newRoom.id, []);

    console.log(`🆕 Room created: ${newRoom.name} by ${userData.username}`);
    
    // 모든 클라이언트에게 새 룸 알림
    io.emit('music_room_created', newRoom);
  });

  socket.on('join_music_room', (data) => {
    const { roomId } = data;
    const userData = connectedUsers.get(socket.id);
    
    if (!userData || !userData.username) {
      socket.emit('music_room_join_error', { message: '로그인이 필요합니다.' });
      return;
    }

    const room = musicRooms.get(roomId);
    if (!room) {
      socket.emit('music_room_join_error', { message: '존재하지 않는 룸입니다.' });
      return;
    }

    if (room.participants >= room.maxUsers) {
      socket.emit('music_room_join_error', { message: '룸이 가득 찼습니다.' });
      return;
    }

    // 이전 룸에서 나가기
    if (userData.currentRoom) {
      handleLeaveRoom(socket, userData.currentRoom);
    }

    // 새 룸 입장
    handleJoinRoom(socket, roomId);
  });

  socket.on('leave_music_room', (data) => {
    const { roomId } = data;
    handleLeaveRoom(socket, roomId);
  });

  // ===== 채팅 =====
  socket.on('music_chat_message', (messageData) => {
    const userData = connectedUsers.get(socket.id);
    if (!userData || !userData.currentRoom) {
      return;
    }

    const message = {
      id: generateId(),
      ...messageData,
      time: new Date().toISOString()
    };

    // 메시지 저장
    const messages = roomMessages.get(userData.currentRoom) || [];
    messages.push(message);
    roomMessages.set(userData.currentRoom, messages);

    console.log(`💬 Chat message in ${userData.currentRoom}: ${message.message}`);
    
    // 룸의 모든 사용자에게 전송
    broadcastToRoom(userData.currentRoom, 'music_chat_message', message);
  });

  socket.on('music_voice_message', (messageData) => {
    const userData = connectedUsers.get(socket.id);
    if (!userData || !userData.currentRoom) {
      return;
    }

    const message = {
      id: generateId(),
      ...messageData,
      time: new Date().toISOString()
    };

    // 메시지 저장
    const messages = roomMessages.get(userData.currentRoom) || [];
    messages.push(message);
    roomMessages.set(userData.currentRoom, messages);

    console.log(`🎤 Voice message in ${userData.currentRoom}`);
    
    // 룸의 모든 사용자에게 전송
    broadcastToRoom(userData.currentRoom, 'music_voice_message', message);
  });

  // ===== 오디오 파일 관리 =====
  socket.on('upload_audio_file', async (data) => {
    const { file, fileName, roomId } = data;
    const userData = connectedUsers.get(socket.id);
    
    if (!userData || userData.currentRoom !== roomId) {
      return;
    }

    try {
      // 파일 저장
      const uniqueFilename = `${Date.now()}-${fileName}`;
      const filePath = path.join(musicDir, uniqueFilename);
      
      fs.writeFileSync(filePath, Buffer.from(file));

      const audioFile = {
        id: generateId(),
        name: fileName,
        filename: uniqueFilename,
        url: `/uploads/music/${uniqueFilename}`,
        size: file.byteLength,
        uploader: userData.username,
        uploadedAt: new Date().toISOString(),
        roomId: roomId
      };

      // 룸의 오디오 파일 목록에 추가
      const roomFiles = roomAudioFiles.get(roomId) || [];
      roomFiles.push(audioFile);
      roomAudioFiles.set(roomId, roomFiles);

      // 룸의 음악 카운트 업데이트
      const room = musicRooms.get(roomId);
      if (room) {
        room.musicCount = roomFiles.length;
        room.updatedAt = new Date().toISOString();
        musicRooms.set(roomId, room);
      }

      console.log(`🎵 Audio file uploaded: ${fileName} to room ${roomId}`);
      
      // 룸의 모든 사용자에게 알림
      broadcastToRoom(roomId, 'audio_file_uploaded', audioFile);
      
      // 룸 목록 업데이트 전송
      io.emit('music_room_updated', room);

    } catch (error) {
      console.error('❌ Audio upload error:', error);
      socket.emit('error', '파일 업로드에 실패했습니다.');
    }
  });

  socket.on('sync_audio_playback', (data) => {
    const { roomId, time, isPlaying } = data;
    const userData = connectedUsers.get(socket.id);
    
    if (!userData || userData.currentRoom !== roomId) {
      return;
    }

    console.log(`🎵 Audio sync in ${roomId}: ${isPlaying ? 'playing' : 'paused'} at ${time}s`);
    
    // 룸의 다른 사용자들에게 동기화 정보 전송
    broadcastToRoom(roomId, 'audio_playback_sync', { time, isPlaying });
  });

  // ===== 시스템 =====
  socket.on('ping', (timestamp, callback) => {
    callback(timestamp);
  });

  // ===== 연결 해제 =====
  socket.on('disconnect', (reason) => {
    const userData = connectedUsers.get(socket.id);
    
    if (userData && userData.currentRoom) {
      handleLeaveRoom(socket, userData.currentRoom);
    }
    
    connectedUsers.delete(socket.id);
    console.log(`❌ User disconnected: ${userData?.username || socket.id} (${reason})`);
  });

  // ===== 헬퍼 함수들 =====
  function handleJoinRoom(socket, roomId) {
    const userData = connectedUsers.get(socket.id);
    const room = musicRooms.get(roomId);
    
    if (!userData || !room) return;

    // 사용자 데이터 업데이트
    userData.currentRoom = roomId;
    connectedUsers.set(socket.id, userData);

    // 룸 참가자 수 증가
    room.participants += 1;
    room.updatedAt = new Date().toISOString();
    musicRooms.set(roomId, room);

    // Socket.IO 룸 입장
    socket.join(roomId);

    // 현재 룸 사용자 목록
    const roomUsers = getUsersInRoom(roomId);
    
    // 입장한 사용자에게 룸 정보 전송
    socket.emit('music_room_join_success', {
      roomId,
      room,
      users: roomUsers
    });

    // 룸의 기존 메시지들 전송
    const messages = roomMessages.get(roomId) || [];
    messages.forEach(message => {
      socket.emit('music_chat_message', message);
    });

    // 룸의 오디오 파일들 전송
    const audioFiles = roomAudioFiles.get(roomId) || [];
    audioFiles.forEach(file => {
      socket.emit('audio_file_uploaded', file);
    });

    console.log(`✅ ${userData.username} joined room: ${room.name}`);
    
    // 룸의 다른 사용자들에게 새 사용자 입장 알림
    socket.to(roomId).emit('music_room_user_joined', {
      id: userData.id,
      username: userData.username,
      role: userData.role,
      joinedAt: userData.joinedAt
    });

    // 전체 사용자에게 룸 정보 업데이트 전송
    io.emit('music_room_updated', room);
  }

  function handleLeaveRoom(socket, roomId) {
    const userData = connectedUsers.get(socket.id);
    const room = musicRooms.get(roomId);
    
    if (!userData || !room) return;

    // Socket.IO 룸 나가기
    socket.leave(roomId);

    // 사용자 데이터 업데이트
    userData.currentRoom = null;
    connectedUsers.set(socket.id, userData);

    // 룸 참가자 수 감소
    room.participants = Math.max(0, room.participants - 1);
    room.updatedAt = new Date().toISOString();
    musicRooms.set(roomId, room);

    console.log(`🚪 ${userData.username} left room: ${room.name}`);
    
    // 룸의 다른 사용자들에게 사용자 퇴장 알림
    socket.to(roomId).emit('music_room_user_left', userData.id);

    // 전체 사용자에게 룸 정보 업데이트 전송
    io.emit('music_room_updated', room);
  }
});

// ===== 서버 시작 =====
const PORT = process.env.PORT || 3001;

// 기본 룸 생성
createDefaultRooms();

server.listen(PORT, () => {
  console.log('🚀 VLYNK Socket.IO Server Started');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔗 Next.js integration: http://localhost:3000`);
  console.log(`🎵 Music Room features enabled`);
  console.log(`📁 Upload directory: ${uploadsDir}`);
  console.log('=====================================');
});

// ===== 에러 처리 =====
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// ===== 정리 작업 =====
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});