'use client';

import { useState, useEffect } from 'react';
import Header from '@/app/components/Header';
import { io, Socket } from 'socket.io-client';

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
    console.log(`[VLYNK] ${message}`);
  };

  useEffect(() => {
    addLog('🔌 Socket.IO 연결 시작...');
    
    // Socket.IO 연결 설정
    const newSocket = io('/', {
      autoConnect: true,
      timeout: 20000,
      transports: ['polling', 'websocket'], 
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    setSocket(newSocket);

    // 연결 성공
    newSocket.on('connect', () => {
      addLog(`✅ Socket.IO 연결 성공! ID: ${newSocket.id}`);
      setConnectionStatus('Connected');
      
      // 사용자 등록
      newSocket.emit('user:register', {
        username: username || 'Anonymous',
        joinedAt: new Date().toISOString()
      });
    });

    // 연결 실패
    newSocket.on('connect_error', (error) => {
      addLog(`❌ 연결 실패: ${error.message}`);
      setConnectionStatus('Connection Failed');
      console.error('Socket.IO Connection Error:', error);
    });

    // 재연결 시도
    newSocket.on('reconnect_attempt', (attempt) => {
      addLog(`🔄 재연결 시도 ${attempt}...`);
      setConnectionStatus(`Reconnecting... (${attempt})`);
    });

    // 재연결 성공
    newSocket.on('reconnect', () => {
      addLog('🔄 재연결 성공!');
      setConnectionStatus('Reconnected');
    });

    // 연결 해제
    newSocket.on('disconnect', (reason) => {
      addLog(`🔌 연결 해제: ${reason}`);
      setConnectionStatus('Disconnected');
    });

    // 사용자 등록 완료
    newSocket.on('user:registered', (userData) => {
      addLog(`👤 사용자 등록 완료: ${userData.username || userData.id}`);
      setCurrentUser(userData.id);
    });

    // 사용자 목록 업데이트
    newSocket.on('users:updated', (users) => {
      addLog(`👥 접속자 수: ${users.length}명`);
    });

    // 채팅 메시지 수신
    newSocket.on('chat:new_message', (messageData) => {
      addLog(`💬 새 메시지: ${messageData.message}`);
    });

    // 에러 핸들링
    newSocket.on('error', (error) => {
      addLog(`❌ Socket 에러: ${error}`);
      console.error('Socket Error:', error);
    });

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (newSocket) {
        addLog('🔌 Socket.IO 연결 종료');
        newSocket.disconnect();
      }
    };
  }, [username]);

  const handleLogin = () => {
    if (username.trim()) {
      setCurrentUser(username);
      setShowLogin(false);
      addLog(`👤 ${username}으로 로그인`);
    }
  };

  const testConnection = async () => {
    addLog('🔍 서버 연결 테스트 중...');
    
    try {
      const response = await fetch('/health');
      const data = await response.json();
      addLog(`✅ 서버 응답: ${data.status}`);
    } catch (error) {
      addLog(`❌ 서버 연결 실패: ${error}`);
    }
  };

  const testSocketConnection = () => {
    if (socket) {
      addLog('🔍 Socket 연결 테스트 중...');
      socket.emit('user:register', {
        username: username || 'TestUser',
        action: 'connection_test'
      });
    } else {
      addLog('❌ Socket이 초기화되지 않음');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff' }}>
      <Header />
      
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
          VLYNK Chat Room - Socket.IO 연결 테스트
        </h1>

        {/* 연결 상태 */}
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: '#111',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <h3>연결 상태</h3>
          <p>상태: <span style={{
            color: connectionStatus.includes('Connected') ? '#00ff00' : 
                  connectionStatus.includes('Failed') ? '#ff0000' : '#ffff00'
          }}>{connectionStatus}</span></p>
          <p>Socket ID: {socket?.id || 'Not connected'}</p>
          <p>현재 사용자: {currentUser || 'Not logged in'}</p>
          
          <div style={{ marginTop: '10px', gap: '10px', display: 'flex' }}>
            <button 
              onClick={testConnection}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              서버 연결 테스트
            </button>
            <button 
              onClick={testSocketConnection}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Socket 연결 테스트
            </button>
          </div>
        </div>

        {/* 로그인 */}
        {showLogin && (
          <div style={{
            padding: '20px',
            marginBottom: '20px',
            backgroundColor: '#111',
            borderRadius: '8px',
            border: '1px solid #333'
          }}>
            <h3>사용자명 입력</h3>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="사용자명을 입력하세요"
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#222',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  flex: 1
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin();
                  }
                }}
              />
              <button
                onClick={handleLogin}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                입장
              </button>
            </div>
          </div>
        )}

        {/* 연결 로그 */}
        <div style={{
          padding: '15px',
          backgroundColor: '#111',
          borderRadius: '8px',
          border: '1px solid #333',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <h3>연결 로그</h3>
          <div style={{ 
            fontFamily: 'monospace', 
            fontSize: '14px',
            lineHeight: '1.4'
          }}>
            {logs.length === 0 ? (
              <p style={{ color: '#666' }}>로그가 없습니다...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} style={{ 
                  marginBottom: '4px',
                  color: log.includes('❌') ? '#ff6b6b' :
                        log.includes('✅') ? '#51cf66' :
                        log.includes('🔄') ? '#ffd43b' : '#fff'
                }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}