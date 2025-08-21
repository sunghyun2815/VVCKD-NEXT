'use client';

import { useState, useEffect } from 'react';
import Header from '@/app/components/Header';
import { io, Socket } from 'socket.io-client'; // ✅ 정상 import
import styles from './chatroom.module.css';

interface Room {
  name: string;
  userCount: number;
  maxUsers?: number;
  hasPassword: boolean;
  creator: string;
  lastMessage?: string;
  lastMessageTime: number;
}

export default function ChatroomPage() {
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentUser, setCurrentUser] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  const [username, setUsername] = useState('');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
    console.log(message);
  };

  useEffect(() => {
    addLog('🔌 Socket.IO 연결 시작');
    
    // Next.js 프록시를 통한 연결
    const newSocket = io({
      autoConnect: true,
      timeout: 10000,
      transports: ['polling', 'websocket'], // polling을 먼저 시도
      forceNew: true
    });
    
    setSocket(newSocket);

    newSocket.on('connect', () => {
      addLog(`✅ 연결 성공! ID: ${newSocket.id}`);
      setConnectionStatus('Connected');
    });

    newSocket.on('disconnect', (reason) => {
      addLog(`❌ 연결 끊어짐: ${reason}`);
      setConnectionStatus('Disconnected');
    });

    newSocket.on('connect_error', (error) => {
      addLog(`❌ 연결 에러: ${error.message}`);
      setConnectionStatus('Connection Error');
    });

    // 채팅룸 목록 받기
    newSocket.on('chat_room_list', (roomList: Room[]) => {
      addLog(`📋 채팅룸 목록 받음: ${roomList.length}개`);
      setRooms(roomList.sort((a, b) => a.name.localeCompare(b.name)));
    });

    newSocket.on('chat_room_created', (data: any) => {
      addLog(`🆕 새 채팅룸 생성됨: ${data.roomName || JSON.stringify(data)}`);
      loadRoomList();
    });

    // 모든 이벤트 로깅
    newSocket.onAny((eventName, ...args) => {
      addLog(`📡 이벤트 [${eventName}]: ${JSON.stringify(args).substring(0, 100)}`);
    });

    return () => {
      addLog('🔌 Socket 연결 해제');
      newSocket.close();
    };
  }, []);

  const handleLogin = () => {
    if (username.trim() && socket && socket.connected) {
      addLog(`🔐 로그인: ${username.trim()}`);
      setCurrentUser(username.trim());
      setShowLogin(false);
      
      socket.emit('user_join', { username: username.trim() });
      
      setTimeout(() => {
        loadRoomList();
      }, 1000);
    } else {
      addLog('❌ Socket이 연결되지 않았거나 사용자명이 없음');
    }
  };

  const loadRoomList = () => {
    if (socket && socket.connected) {
      addLog('📋 채팅룸 목록 요청');
      socket.emit('get_chat_room_list');
    } else {
      addLog('❌ Socket이 연결되지 않음 - 룸 목록 요청 불가');
    }
  };

  const testCreateRoom = () => {
    if (socket && socket.connected) {
      const roomName = prompt('방 이름을 입력하세요:');
      if (roomName && roomName.trim()) {
        addLog(`🆕 방 생성: ${roomName.trim()}`);
        socket.emit('create_chat_room', {
          roomName: roomName.trim(),
          maxUsers: null,
          password: null
        });
      }
    } else {
      addLog('❌ Socket이 연결되지 않음');
      alert('서버에 연결되지 않았습니다.');
    }
  };

  const retryConnection = () => {
    addLog('🔄 연결 재시도');
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
  };

  if (showLogin) {
    return (
      <>
        <Header />
        <div className={styles.loginModal}>
          <div className={styles.loginTerminal}>
            <div className={styles.loginTitle}>VLYNK CHAT ACCESS</div>
            <div className={styles.loginSubtitle}>ENTER USERNAME</div>
            
            {/* 연결 상태 표시 */}
            <div style={{ 
              fontSize: '8px', 
              color: connectionStatus === 'Connected' ? '#00FF00' : '#FF0000',
              marginBottom: '10px'
            }}>
              Status: {connectionStatus}
            </div>
            
            <input
              type="text"
              className={styles.loginInput}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="USERNAME"
              maxLength={20}
              autoFocus
            />
            <button 
              className={styles.loginBtn} 
              onClick={handleLogin}
              disabled={connectionStatus !== 'Connected'}
            >
              ENTER CHAT
            </button>

            {/* 디버그 로그 */}
            <div style={{
              marginTop: '15px',
              background: '#111',
              padding: '10px',
              height: '150px',
              overflowY: 'auto',
              fontSize: '8px',
              border: '1px solid #333',
              borderRadius: '4px'
            }}>
              {logs.map((log, index) => (
                <div key={index} style={{ marginBottom: '2px' }}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.chatroomContainer}>
        <div className={styles.userInfo}>
          USER: <span>{currentUser}</span>
          <div style={{ fontSize: '8px', marginTop: '5px' }}>
            Status: <span style={{ color: connectionStatus === 'Connected' ? '#00FF00' : '#FF0000' }}>
              {connectionStatus}
            </span>
          </div>
        </div>

        <div className={styles.createSection}>
          <button 
            className={styles.createRoomBtn} 
            onClick={testCreateRoom}
            disabled={connectionStatus !== 'Connected'}
          >
            + CREATE ROOM
          </button>
        </div>

        <div className={styles.mainContainer}>
          <div className={styles.chatHeader}>
            <h1>VLYNK CHAT ROOMS <span className={styles.cursor}>▌</span></h1>
          </div>

          {/* 디버그 정보 */}
          <div style={{
            background: '#191919',
            border: '1px solid #333',
            padding: '10px',
            margin: '20px 0',
            borderRadius: '8px',
            fontSize: '8px',
            textAlign: 'center'
          }}>
            <div>연결 상태: {connectionStatus}</div>
            <div>사용자: {currentUser}</div>
            <div>방 개수: {rooms.length}</div>
            <button 
              onClick={loadRoomList}
              style={{
                background: '#FF5500',
                color: '#000',
                border: 'none',
                padding: '5px 10px',
                fontSize: '7px',
                cursor: 'pointer',
                borderRadius: '4px',
                marginTop: '5px',
                marginRight: '5px'
              }}
            >
              🔄 새로고침
            </button>
            <button 
              onClick={retryConnection}
              style={{
                background: '#FFAA00',
                color: '#000',
                border: 'none',
                padding: '5px 10px',
                fontSize: '7px',
                cursor: 'pointer',
                borderRadius: '4px',
                marginTop: '5px'
              }}
            >
              🔄 재연결
            </button>
          </div>

          {/* 채팅룸 목록 */}
          <div className={styles.chatHub}>
            <div className={styles.chatColumn}>
              {rooms
                .filter((_, index) => index % 2 === 0)
                .map((room) => (
                  <div
                    key={room.name}
                    className={styles.chatRoom}
                    onClick={() => alert(`방 입장: ${room.name}`)}
                  >
                    <span className={styles.chatTitle}>
                      {room.name}
                      {room.hasPassword && ' 🔒'}
                    </span>
                    <span className={styles.chatTime}>
                      {room.userCount} users
                    </span>
                  </div>
                ))}
            </div>
            
            <div className={styles.chatColumn}>
              {rooms
                .filter((_, index) => index % 2 === 1)
                .map((room) => (
                  <div
                    key={room.name}
                    className={styles.chatRoom}
                    onClick={() => alert(`방 입장: ${room.name}`)}
                  >
                    <span className={styles.chatTitle}>
                      {room.name}
                      {room.hasPassword && ' 🔒'}
                    </span>
                    <span className={styles.chatTime}>
                      {room.userCount} users
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {rooms.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: '#FFFFFF',
              opacity: 0.6,
              padding: '20px',
              fontSize: '8px'
            }}>
              {connectionStatus === 'Connected' ? 
                '채팅룸이 없습니다. 새 룸을 만들어보세요!' : 
                '서버에 연결 중...'}
            </div>
          )}

          {/* 로그 */}
          <div style={{
            background: '#111',
            padding: '15px',
            height: '200px',
            overflowY: 'auto',
            fontSize: '8px',
            border: '1px solid #333',
            borderRadius: '4px',
            marginTop: '20px'
          }}>
            <strong>연결 로그:</strong>
            {logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '2px' }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}