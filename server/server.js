const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS 설정
app.use(cors({
  origin: "http://localhost:3000", // Next.js 개발 서버 포트
  credentials: true
}));

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// uploads 폴더 생성
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// music 폴더 생성 (음악 파일 전용)
const musicDir = path.join(__dirname, 'uploads', 'music');
if (!fs.existsSync(musicDir)) {
    fs.mkdirSync(musicDir);
}

// [기존 multer 설정들과 라우트들은 그대로 유지]
// ... (제공받은 server.js 코드의 multer 설정부터 모든 소켓 이벤트까지 동일)

const PORT = process.env.PORT || 3001; // Next.js와 포트 충돌 방지
server.listen(PORT, () => {
    console.log(`🚀 Socket.IO 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`🔗 Next.js와 연동: http://localhost:3000`);
    console.log(`🎵 VLYNK Music Room 기능이 활성화되었습니다!`);
});