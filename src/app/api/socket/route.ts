import { NextRequest } from 'next/server';
import { Server as IOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

// 글로벌 Socket.IO 서버 인스턴스
let io: IOServer;

// 임시 메모리 저장소 (실제로는 데이터베이스 사용)
const rooms = new Map();
const users = new Map();

export async function GET(req: NextRequest) {
  if (!io) {
    // Socket.IO 서버 초기화
    const httpServer = new HTTPServer();
    io = new IOServer(httpServer, {
      path: '/api/socket',
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    // Socket.IO 이벤트 핸들러
    io.on('connection', (socket) => {
      console.log('🔗 User connected:', socket.id);

      // 사용자 정보 저장
      const userId = socket.handshake.auth.userId;
      if (userId) {
        users.set(socket.id, { id: userId, socketId: socket.id });
      }

      // 룸 목록 요청
      socket.on('get music room list', () => {
        const roomList = Array.from(rooms.values());
        socket.emit('music room list', roomList);
      });

      // 룸 생성
      socket.on('create music room', (roomData) => {
        const newRoom = {
          ...roomData,
          id: `room-${Date.now()}`,
          participants: 1,
          musicCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        rooms.set(newRoom.id, newRoom);
        io.emit('music room created', newRoom);
        io.emit('music room list', Array.from(rooms.values()));
      });

      // 룸 입장
      socket.on('join music room', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room) {
          socket.emit('music room join error', { message: '존재하지 않는 룸입니다.' });
          return;
        }

        if (room.participants >= room.maxUsers) {
          socket.emit('music room join error', { message: '룸이 가득 찼습니다.' });
          return;
        }

        // 룸 입장 처리
        socket.join(roomId);
        room.participants += 1;
        room.updatedAt = new Date().toISOString();
        rooms.set(roomId, room);

        // 성공 응답
        socket.emit('music room join success', {
          roomId,
          room,
          users: [] // 실제로는 룸의 사용자 목록
        });

        // 다른 사용자들에게 업데이트 알림
        io.emit('music room updated', room);
      });

      // 룸 나가기
      socket.on('leave music room', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room) {
          socket.leave(roomId);
          room.participants = Math.max(0, room.participants - 1);
          room.updatedAt = new Date().toISOString();
          rooms.set(roomId, room);
          
          io.emit('music room updated', room);
        }
      });

      // 채팅 메시지
      socket.on('music chat message', (messageData) => {
        const message = {
          ...messageData,
          id: `msg-${Date.now()}`,
          time: new Date().toISOString()
        };
        
        // 같은 룸의 모든 사용자에게 전송
        io.to(messageData.roomId).emit('music chat message', message);
      });

      // 음성 메시지
      socket.on('music voice message', (voiceData) => {
        const voiceMessage = {
          ...voiceData,
          id: `voice-${Date.now()}`,
          time: new Date().toISOString()
        };
        
        // 같은 룸의 모든 사용자에게 전송
        io.to(voiceData.roomId).emit('music voice message', voiceMessage);
      });

      // 연결 해제
      socket.on('disconnect', () => {
        console.log('🔌 User disconnected:', socket.id);
        users.delete(socket.id);
      });
    });

    console.log('✅ Socket.IO Server initialized');
  }

  return new Response('Socket.IO Server Running', { status: 200 });
}