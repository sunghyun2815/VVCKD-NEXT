// src/app/vlynk/project/page.tsx
// ✨ Import 에러 수정 버전

'use client';
import React, { useState, useCallback, useEffect } from 'react';
import type { MusicRoom, ChatMessage } from './types/project.types';
import styles from './project.module.css';

// ===== 임시 더미 컴포넌트들 (LoginModal과 ProjectGrid가 없을 경우) =====
// 나중에 실제 컴포넌트로 교체

// 임시 LoginModal 컴포넌트
function TempLoginModal({ onLogin, isVisible }: { onLogin: (username: string) => void; isVisible: boolean }) {
  const [username, setUsername] = useState('');

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.9)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: '#000',
        border: '2px solid #FF5500',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 0 20px rgba(255, 85, 0, 0.3)'
      }}>
        <div style={{ color: '#FF5500', fontSize: '16px', marginBottom: '20px' }}>
          MUSIC ACCESS TERMINAL
        </div>
        <div style={{ color: '#fff', fontSize: '10px', marginBottom: '15px' }}>
          ENTER USER CREDENTIALS
        </div>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #FF5500',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '10px',
            marginBottom: '20px',
            width: '200px',
            textAlign: 'center'
          }}
          placeholder="USERNAME"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && username.trim()) {
              onLogin(username.trim());
            }
          }}
        />
        <br />
        <button
          onClick={() => {
            if (username.trim()) {
              onLogin(username.trim());
            }
          }}
          style={{
            backgroundColor: '#FF5500',
            color: '#000',
            border: 'none',
            padding: '10px 20px',
            fontFamily: 'monospace',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          INITIALIZE CONNECTION
        </button>
      </div>
    </div>
  );
}

// 임시 ProjectGrid 컴포넌트
function TempProjectGrid({ 
  rooms, 
  onJoinRoom, 
  onCreateRoom, 
  onViewRoomInfo, 
  currentUser, 
  isLoading 
}: {
  rooms: MusicRoom[];
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: (roomName: string) => void;
  onViewRoomInfo: (roomId: string) => void;
  currentUser: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        color: '#FF5500', 
        fontSize: '12px',
        marginTop: '100px'
      }}>
        Loading rooms...
      </div>
    );
  }

  return (
    <div style={{ 
      marginTop: '80px', 
      padding: '20px',
      fontFamily: 'monospace',
      color: '#FF5500'
    }}>
      {/* 헤더 */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: '24px', 
          color: '#FF5500', 
          textShadow: '0 0 10px #FF5500',
          marginBottom: '10px'
        }}>
          VVCKD MUSIC ROOMS
        </h1>
        <div style={{ color: '#fff', fontSize: '10px' }}>
          ENHANCED COLLABORATIVE MUSIC WORKSPACE
        </div>
      </div>

      {/* 룸 생성 섹션 */}
      <div style={{
        border: '2px dashed #FF5500',
        padding: '30px',
        textAlign: 'center',
        marginBottom: '40px',
        backgroundColor: 'rgba(255, 102, 0, 0.05)'
      }}>
        <h3 style={{ color: '#FF5500', marginBottom: '20px' }}>
          CREATE MUSIC ROOM
        </h3>
        <button
          onClick={() => {
            const roomName = prompt('음악 룸 이름을 입력하세요:');
            if (roomName) {
              onCreateRoom(roomName);
            }
          }}
          style={{
            backgroundColor: '#FF5500',
            color: '#000',
            border: 'none',
            padding: '15px 30px',
            fontFamily: 'monospace',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          + CREATE ROOM
        </button>
      </div>

      {/* 룸 목록 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {rooms.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            border: '2px solid #FF5500',
            backgroundColor: '#000'
          }}>
            <div style={{ color: '#888', marginBottom: '20px' }}>
              No rooms available
            </div>
            <div style={{ color: '#666', fontSize: '8px' }}>
              Create the first music room to get started!
            </div>
          </div>
        ) : (
          rooms.map((room) => (
            <div 
              key={room.id}
              style={{
                border: '2px solid #FF5500',
                backgroundColor: '#000',
                padding: '20px',
                transition: 'all 0.3s'
              }}
            >
              {/* 룸 제목 */}
              <div style={{
                color: '#FF5500',
                fontSize: '12px',
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{room.name}</span>
                <span style={{
                  fontSize: '8px',
                  padding: '4px 8px',
                  border: '1px solid #00FF00',
                  color: '#00FF00',
                  backgroundColor: 'rgba(0, 255, 0, 0.1)'
                }}>
                  {room.status.toUpperCase()}
                </span>
              </div>

              {/* 룸 정보 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '10px',
                fontSize: '8px'
              }}>
                <span style={{ color: '#FFFF00' }}>
                  👥 {room.participants}/{room.maxUsers} users
                </span>
                <span style={{ color: '#00FF00' }}>
                  🎵 {room.musicCount} tracks
                </span>
              </div>

              {/* 룸 설명 */}
              <div style={{
                color: '#fff',
                fontSize: '9px',
                marginBottom: '15px',
                lineHeight: '14px'
              }}>
                {room.description}
              </div>

              {/* 버튼들 */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => onJoinRoom(room.id)}
                  disabled={room.participants >= room.maxUsers}
                  style={{
                    backgroundColor: room.participants >= room.maxUsers ? '#666' : 'transparent',
                    color: room.participants >= room.maxUsers ? '#333' : '#00FF00',
                    border: `1px solid ${room.participants >= room.maxUsers ? '#666' : '#00FF00'}`,
                    padding: '6px 12px',
                    fontFamily: 'monospace',
                    fontSize: '7px',
                    cursor: room.participants >= room.maxUsers ? 'not-allowed' : 'pointer'
                  }}
                >
                  {room.participants >= room.maxUsers ? '🔒 FULL' : '🚪 JOIN ROOM'}
                </button>
                
                <button
                  onClick={() => onViewRoomInfo(room.id)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#FF5500',
                    border: '1px solid #FF5500',
                    padding: '6px 12px',
                    fontFamily: 'monospace',
                    fontSize: '7px',
                    cursor: 'pointer'
                  }}
                >
                  ℹ️ INFO
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 통계 */}
      {rooms.length > 0 && (
        <div style={{
          textAlign: 'center',
          marginTop: '30px',
          padding: '20px',
          border: '1px solid #333',
          backgroundColor: 'rgba(255, 85, 0, 0.05)'
        }}>
          <div style={{ color: '#FF5500', fontSize: '10px', marginBottom: '10px' }}>
            📊 ROOM STATISTICS
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '30px', 
            fontSize: '8px',
            flexWrap: 'wrap'
          }}>
            <span style={{ color: '#00FF00' }}>✅ Total Rooms: {rooms.length}</span>
            <span style={{ color: '#FFFF00' }}>👥 Total Users: {rooms.reduce((sum, room) => sum + room.participants, 0)}</span>
            <span style={{ color: '#FF5500' }}>🎵 Total Tracks: {rooms.reduce((sum, room) => sum + room.musicCount, 0)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 메인 페이지 컴포넌트 =====
export default function ProjectPage() {
  // ===== 기본 상태 관리 =====
  const [currentUser, setCurrentUser] = useState<string>('');
  const [userRole, setUserRole] = useState<'admin' | 'user' | 'guest'>('guest');
  const [showLogin, setShowLogin] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'room'>('list');
  const [chatInput, setChatInput] = useState('');

  // ===== 임시 데이터 (실제 Socket.IO 대신) =====
  const [rooms, setRooms] = useState<MusicRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<MusicRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // 초기 더미 데이터 로드
  useEffect(() => {
    if (!showLogin) {
      setIsLoading(true);
      setTimeout(() => {
        const dummyRooms: MusicRoom[] = [
          {
            id: 'room-1',
            name: 'Lo-Fi Beats Studio',
            description: 'Chill lo-fi beats for studying and relaxing',
            genres: ['Lo-Fi', 'Ambient'],
            maxUsers: 8,
            participants: 3,
            musicCount: 12,
            status: 'active',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'LoFiMaster'
          },
          {
            id: 'room-2',
            name: 'EDM Collaboration Hub',
            description: 'Electronic dance music production workspace',
            genres: ['EDM', 'House'],
            maxUsers: 12,
            participants: 7,
            musicCount: 24,
            status: 'active',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'BeatDrop99'
          }
        ];
        setRooms(dummyRooms);
        setIsLoading(false);
        setIsConnected(true);
      }, 1000);
    }
  }, [showLogin]);

  // ===== 로그인 처리 =====
  const handleLogin = useCallback((username: string) => {
    const trimmedUsername = username.trim();
    
    let role: 'admin' | 'user' | 'guest' = 'user';
    if (trimmedUsername.toLowerCase() === 'admin') {
      role = 'admin';
    } else if (trimmedUsername.toLowerCase() === 'guest') {
      role = 'guest';
    }

    setCurrentUser(trimmedUsername);
    setUserRole(role);
    setShowLogin(false);
    
    console.log('✅ User logged in:', { username: trimmedUsername, role });
  }, []);

  // ===== 룸 생성 처리 =====
  const handleCreateRoom = useCallback((roomName: string) => {
    if (!currentUser || currentUser === 'GUEST') {
      console.warn('❌ Unauthorized room creation attempt');
      return;
    }

    const newRoom: MusicRoom = {
      id: `room-${Date.now()}`,
      name: roomName,
      description: 'New collaborative music workspace',
      genres: ['Electronic', 'Hip-Hop'],
      maxUsers: 10,
      participants: 1,
      musicCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser
    };

    setRooms(prevRooms => [...prevRooms, newRoom]);
    console.log('✅ Room created:', newRoom);
    alert(`룸 "${roomName}"이 성공적으로 생성되었습니다!`);
  }, [currentUser]);

  // ===== 룸 입장 처리 =====
  const handleJoinRoom = useCallback((roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      alert('존재하지 않는 룸입니다.');
      return;
    }

    if (room.participants >= room.maxUsers) {
      alert('룸이 가득 찼습니다.');
      return;
    }

    setRooms(prevRooms => 
      prevRooms.map(r => 
        r.id === roomId 
          ? { ...r, participants: r.participants + 1 }
          : r
      )
    );

    setCurrentRoom(room);
    setViewMode('room');
    
    console.log('✅ Joined room:', room.name);
  }, [rooms]);

  // ===== 룸 나가기 처리 =====
  const handleLeaveRoom = useCallback(() => {
    if (!currentRoom) return;

    setRooms(prevRooms => 
      prevRooms.map(r => 
        r.id === currentRoom.id 
          ? { ...r, participants: Math.max(0, r.participants - 1) }
          : r
      )
    );

    setCurrentRoom(null);
    setViewMode('list');
    setMessages([]);
    
    console.log('✅ Left room:', currentRoom.name);
  }, [currentRoom]);

  // ===== 룸 정보 보기 처리 =====
  const handleViewRoomInfo = useCallback((roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const info = `
룸 이름: ${room.name}
설명: ${room.description}
참가자: ${room.participants}/${room.maxUsers}명
음악 트랙: ${room.musicCount}개
상태: ${room.status.toUpperCase()}
장르: ${room.genres?.join(', ') || '설정 안됨'}
생성일: ${new Date(room.createdAt).toLocaleDateString()}
생성자: ${room.createdBy || '알 수 없음'}
    `.trim();

    alert(info);
    console.log('ℹ️ Viewing room info:', room);
  }, [rooms]);

  // ===== 채팅 메시지 전송 =====
  const handleSendChatMessage = useCallback(() => {
    const message = chatInput.trim();
    if (!message || !currentRoom) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      roomId: currentRoom.id,
      user: currentUser,
      message: message,
      timestamp: 0,
      time: new Date().toISOString(),
      type: 'text'
    };

    setMessages(prev => [...prev, newMessage]);
    setChatInput('');
    console.log('💬 Message sent:', newMessage);
  }, [chatInput, currentRoom, currentUser]);

  // ===== 로그인 화면 =====
  if (showLogin) {
    return <TempLoginModal onLogin={handleLogin} isVisible={true} />;
  }

  // ===== 음악 룸 화면 =====
  if (viewMode === 'room' && currentRoom) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#181818',
        color: '#FF5500',
        fontFamily: 'monospace'
      }}>
        {/* 사용자 정보 */}
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          border: '1px solid #FF5500',
          padding: '8px 12px',
          fontSize: '10px',
          zIndex: 1000
        }}>
          USER: <span style={{ fontWeight: 'bold' }}>{currentUser}</span>
          <span style={{ color: '#FFFF00', marginLeft: '10px' }}>
            [{userRole.toUpperCase()}]
          </span>
          <div style={{ marginTop: '5px', fontSize: '8px' }}>
            {isConnected ? '🟢 연결됨' : '🔴 연결 끊김'}
          </div>
        </div>

        {/* 룸 헤더 */}
        <div style={{
          backgroundColor: '#000',
          borderBottom: '2px solid #FF5500',
          padding: '15px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ color: '#FF5500', fontSize: '12px' }}>
            🎵 {currentRoom.name}
          </div>
          <button
            onClick={handleLeaveRoom}
            style={{
              backgroundColor: '#FF0000',
              color: '#fff',
              border: 'none',
              padding: '8px 15px',
              fontFamily: 'monospace',
              fontSize: '8px',
              cursor: 'pointer'
            }}
          >
            LEAVE ROOM
          </button>
        </div>
        
        {/* 룸 컨텐츠 */}
        <div style={{ 
          display: 'flex',
          height: 'calc(100vh - 60px)',
          padding: '20px'
        }}>
          {/* 메인 영역 */}
          <div style={{ 
            flex: 1,
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div>🎵 Welcome to {currentRoom.name}!</div>
            <div style={{ fontSize: '10px', textAlign: 'center' }}>
              {currentRoom.description}
            </div>
            <div style={{ fontSize: '8px', color: '#666' }}>
              실제 MusicRoom 컴포넌트가 여기에 들어갈 예정입니다.
            </div>
          </div>

          {/* 채팅 사이드바 */}
          <div style={{
            width: '300px',
            borderLeft: '2px solid #FF5500',
            backgroundColor: '#111',
            display: 'flex',
            flexDirection: 'column',
            padding: '15px'
          }}>
            <div style={{ marginBottom: '15px', textAlign: 'center' }}>
              💬 채팅
            </div>
            
            {/* 메시지 목록 */}
            <div style={{ flex: 1, marginBottom: '15px', fontSize: '8px' }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{
                  marginBottom: '8px',
                  padding: '5px',
                  backgroundColor: 'rgba(255, 85, 0, 0.1)',
                  borderRadius: '3px'
                }}>
                  <div style={{ color: '#FFFF00', fontSize: '7px' }}>
                    {msg.user}
                  </div>
                  <div style={{ color: '#fff' }}>
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>

            {/* 채팅 입력 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendChatMessage();
                  }
                }}
                placeholder="메시지 입력..."
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  border: '1px solid #FF5500',
                  color: '#fff',
                  padding: '6px',
                  fontSize: '8px'
                }}
              />
              <button
                onClick={handleSendChatMessage}
                style={{
                  backgroundColor: '#FF5500',
                  color: '#000',
                  border: 'none',
                  padding: '6px 10px',
                  fontSize: '7px',
                  cursor: 'pointer'
                }}
              >
                전송
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== 메인 프로젝트 목록 화면 =====
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#181818',
      color: '#FF5500',
      fontFamily: 'monospace'
    }}>
      {/* 사용자 정보 */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        border: '1px solid #FF5500',
        padding: '8px 12px',
        fontSize: '10px',
        zIndex: 1000
      }}>
        USER: <span style={{ fontWeight: 'bold' }}>{currentUser}</span>
        <span style={{ color: '#FFFF00', marginLeft: '10px' }}>
          [{userRole.toUpperCase()}]
        </span>
        <div style={{ marginTop: '5px', fontSize: '8px' }}>
          {isConnected ? '🟢 시스템 온라인' : '🔴 시스템 오프라인'}
        </div>
      </div>

      {/* 네비게이션 바 */}
      <div style={{
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        backgroundColor: '#000',
        borderBottom: '2px solid #FF5500',
        padding: '15px 20px',
        display: 'flex',
        gap: '20px',
        zIndex: 1000,
        fontSize: '8px'
      }}>
        <a href="/vlynk" style={{ color: '#FF5500', textDecoration: 'none', border: '1px solid #FF5500', padding: '8px 15px' }}>
          CHAT ROOM
        </a>
        <a href="/vlynk/project" style={{ color: '#000', backgroundColor: '#FF5500', textDecoration: 'none', border: '1px solid #FF5500', padding: '8px 15px' }}>
          MUSIC
        </a>
        <a href="#" style={{ color: '#FF5500', textDecoration: 'none', border: '1px solid #FF5500', padding: '8px 15px' }}>
          GALLERY
        </a>
        <a href="#" style={{ color: '#FF5500', textDecoration: 'none', border: '1px solid #FF5500', padding: '8px 15px' }}>
          PROJECTS
        </a>
      </div>

      {/* 프로젝트 그리드 */}
      <TempProjectGrid
        rooms={rooms}
        onJoinRoom={handleJoinRoom}
        onCreateRoom={handleCreateRoom}
        onViewRoomInfo={handleViewRoomInfo}
        currentUser={currentUser}
        isLoading={isLoading}
      />

      {/* 상태 표시 */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid #FF5500',
        padding: '8px 12px',
        fontSize: '8px',
        zIndex: 1000
      }}>
        🟢 SYSTEM ONLINE | USER: {currentUser} | ROOMS: {rooms.length}
      </div>
    </div>
  );
}