'use client';

import React, { useState, useCallback, useEffect } from 'react';
import LoginModal from './components/LoginModal';
import ProjectGrid from './components/ProjectGrid';
import MusicRoomView from './components/MusicRoomView';
import UserProfile from './components/UserProfile';
import UserSystemDemo from './components/UserSystemDemo';
import { useVlynkSocket } from '../hooks/useVlynkSocket';
import type { 
  MusicRoom, 
  ChatMessage, 
  User,
  VlynkUser 
} from './types/project.types';
import styles from './project.module.css';

// ===== 더미 룸 데이터 =====
const DUMMY_ROOMS: MusicRoom[] = [
  {
    id: 'room-1',
    name: 'Lo-Fi Study Session',
    description: 'Chill beats for coding and studying',
    genres: ['lo-fi', 'chill', 'study'],
    maxUsers: 20,
    participants: 12,
    musicCount: 45,
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T15:20:00Z',
    createdBy: 'user123'
  },
  {
    id: 'room-2',
    name: 'Electronic Playground',
    description: 'Experimental electronic music collaboration',
    genres: ['electronic', 'experimental', 'techno'],
    maxUsers: 15,
    participants: 8,
    musicCount: 32,
    status: 'active',
    createdAt: '2024-01-14T14:20:00Z',
    updatedAt: '2024-01-15T12:10:00Z',
    createdBy: 'producer_alex'
  },
  {
    id: 'room-3',
    name: 'Ambient Soundscapes',
    description: 'Creating atmospheric music together',
    genres: ['ambient', 'atmospheric', 'drone'],
    maxUsers: 10,
    participants: 3,
    musicCount: 18,
    status: 'development',
    createdAt: '2024-01-13T09:15:00Z',
    updatedAt: '2024-01-15T11:30:00Z',
    createdBy: 'ambient_lover'
  },
  {
    id: 'room-4',
    name: 'Hip-Hop Workshop',
    description: 'Beat making and rap collaboration',
    genres: ['hip-hop', 'rap', 'beats'],
    maxUsers: 25,
    participants: 0,
    musicCount: 0,
    status: 'planning',
    createdAt: '2024-01-15T16:00:00Z',
    updatedAt: '2024-01-15T16:00:00Z',
    createdBy: 'beat_master'
  }
];

// ===== 더미 사용자 생성 함수 =====
const generateConnectedUsers = (currentUser: string): User[] => [
  {
    id: 'user-1',
    username: currentUser,
    role: 'admin',
    joinedAt: new Date().toISOString()
  },
  {
    id: 'user-2',
    username: 'producer_alex',
    role: 'user',
    joinedAt: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: 'user-3',
    username: 'beat_master',
    role: 'user',
    joinedAt: new Date(Date.now() - 600000).toISOString()
  },
  {
    id: 'user-4',
    username: 'lo_fi_girl',
    role: 'user',
    joinedAt: new Date(Date.now() - 900000).toISOString()
  }
];

// ===== 메인 컴포넌트 =====
export default function ProjectPage() {
  // ===== 상태 관리 =====
  const [currentUser, setCurrentUser] = useState<string>('');
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [rooms, setRooms] = useState<MusicRoom[]>(DUMMY_ROOMS);
  const [currentRoom, setCurrentRoom] = useState<MusicRoom | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'lobby' | 'room' | 'profile' | 'demo'>('lobby');
  const [selectedProfile, setSelectedProfile] = useState<VlynkUser | null>(null);

  // ===== Socket.IO 훅 사용 =====
  const {
    socket,
    isConnected,
    isConnecting,
    hasError,
    error,
    connectionState,
    rooms: socketRooms,
    currentRoom: socketCurrentRoom,
    connectedUsers: socketUsers,
    messages,
    joinRoom: socketJoinRoom,
    leaveRoom: socketLeaveRoom,
    createRoom: socketCreateRoom,
    sendMessage,
    measureLatency,
  } = useVlynkSocket(currentUser);

  // ===== 이벤트 핸들러들 =====

  // 로그인 처리
  const handleLogin = useCallback((username: string) => {
    console.log('🔐 User login attempt:', username);
    setCurrentUser(username);
    setShowLoginModal(false);
    
    // 연결된 사용자 목록 초기화
    setConnectedUsers(generateConnectedUsers(username));
    
    // 실제 서버 연결 시뮬레이션
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setCurrentView('lobby');
      console.log('✅ Login successful, user connected to VLYNK');
    }, 1500);
  }, []);

  // 방 참가 처리
  const handleJoinRoom = useCallback((roomId: string) => {
    console.log('🚪 Attempting to join room:', roomId);
    
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      console.error('❌ Room not found:', roomId);
      return;
    }

    if (room.participants >= room.maxUsers) {
      alert('이 방은 가득 찼습니다.');
      return;
    }

    setIsLoading(true);
    
    // Socket.IO를 통한 방 참가
    if (socket && isConnected) {
      socketJoinRoom(roomId);
    }

    // 시뮬레이션
    setTimeout(() => {
      setCurrentRoom(room);
      
      // 참가자 수 업데이트
      setRooms(prevRooms => 
        prevRooms.map(r => 
          r.id === roomId 
            ? { ...r, participants: r.participants + 1 }
            : r
        )
      );
      
      setCurrentView('room');
      setIsLoading(false);
      console.log('✅ Successfully joined room:', room.name);
    }, 1000);
  }, [rooms, socket, isConnected, socketJoinRoom]);

  // 방 나가기 처리
  const handleLeaveRoom = useCallback(() => {
    if (!currentRoom) return;
    
    console.log('🚪 Leaving room:', currentRoom.name);
    
    // Socket.IO를 통한 방 나가기
    if (socket && isConnected) {
      socketLeaveRoom();
    }
    
    // 참가자 수 업데이트
    setRooms(prevRooms => 
      prevRooms.map(r => 
        r.id === currentRoom.id 
          ? { ...r, participants: Math.max(0, r.participants - 1) }
          : r
      )
    );
    
    setCurrentRoom(null);
    setCurrentView('lobby');
    console.log('✅ Successfully left room');
  }, [currentRoom, socket, isConnected, socketLeaveRoom]);

  // 새 방 생성 처리
  const handleCreateRoom = useCallback((roomName: string) => {
    console.log('🆕 Creating new room:', roomName);
    
    setIsLoading(true);
    
    const newRoom: MusicRoom = {
      id: `room-${Date.now()}`,
      name: roomName,
      description: `Created by ${currentUser}`,
      genres: [],
      maxUsers: 20,
      participants: 1,
      musicCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser
    };

    // Socket.IO를 통한 방 생성
    if (socket && isConnected) {
      socketCreateRoom({
        name: roomName,
        description: newRoom.description,
        maxUsers: 20,
        participants: 0,
        musicCount: 0,
        status: 'active',
        createdBy: currentUser
      });
    }

    // 시뮬레이션
    setTimeout(() => {
      setRooms(prevRooms => [...prevRooms, newRoom]);
      setCurrentRoom(newRoom);
      setCurrentView('room');
      setIsLoading(false);
      console.log('✅ Successfully created room:', roomName);
    }, 1000);
  }, [currentUser, socket, isConnected, socketCreateRoom]);

  // 방 정보 보기
  const handleViewRoomInfo = useCallback((roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      alert(`방 정보:\n이름: ${room.name}\n설명: ${room.description}\n참가자: ${room.participants}/${room.maxUsers}\n생성자: ${room.createdBy}`);
    }
  }, [rooms]);

  // 프로필 보기
  const handleShowProfile = useCallback(() => {
    setCurrentView('profile');
  }, []);

  // 데모 보기
  const handleShowDemo = useCallback(() => {
    setCurrentView('demo');
  }, []);

  // 로비로 돌아가기
  const handleBackToLobby = useCallback(() => {
    if (currentRoom) {
      handleLeaveRoom();
    } else {
      setCurrentView('lobby');
      setSelectedProfile(null);
    }
  }, [currentRoom, handleLeaveRoom]);

  // ===== 효과들 =====
  
  // Socket 상태 변화 감지
  useEffect(() => {
    if (socketRooms.length > 0) {
      setRooms(socketRooms);
    }
  }, [socketRooms]);

  useEffect(() => {
    if (socketCurrentRoom) {
      setCurrentRoom(socketCurrentRoom);
      setCurrentView('room');
    }
  }, [socketCurrentRoom]);

  useEffect(() => {
    if (socketUsers.length > 0) {
      setConnectedUsers(socketUsers);
    }
  }, [socketUsers]);

  // ===== 렌더링 =====

  // 로딩 상태
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <div className={styles.loadingText}>
          {currentView === 'lobby' ? 'VLYNK에 연결 중...' : 
           currentView === 'room' ? '음악실 입장 중...' : 
           '처리 중...'}
        </div>
      </div>
    );
  }

  // 로그인 모달
  if (showLoginModal) {
    return (
      <div className={styles.pageContainer}>
        <LoginModal 
          onLogin={handleLogin}
          isVisible={showLoginModal}
        />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* 헤더 */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerTitle}>🎵 VLYNK Music Room</h1>
          <div className={styles.connectionStatus}>
            <span 
              className={`${styles.statusDot} ${
                isConnected ? styles.connected : 
                isConnecting ? styles.connecting : 
                hasError ? styles.error : styles.disconnected
              }`}
            />
            <span className={styles.statusText}>
              {isConnected ? 'CONNECTED' : 
               isConnecting ? 'CONNECTING...' : 
               hasError ? 'ERROR' : 'DISCONNECTED'}
            </span>
            {connectionState.latency && (
              <span className={styles.latency}>
                ({connectionState.latency.toFixed(0)}ms)
              </span>
            )}
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.userInfo}>
            <span className={styles.username}>👤 {currentUser}</span>
            {currentRoom && (
              <span className={styles.currentRoom}>
                📍 {currentRoom.name}
              </span>
            )}
          </div>

          <div className={styles.headerActions}>
            {currentView !== 'lobby' && (
              <button onClick={handleBackToLobby} className={styles.backBtn}>
                ← 로비
              </button>
            )}
            
            <button onClick={handleShowProfile} className={styles.profileBtn}>
              👤 프로필
            </button>
            
            <button onClick={handleShowDemo} className={styles.demoBtn}>
              🧪 데모
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className={styles.mainContent}>
        {/* 로비 뷰 */}
        {currentView === 'lobby' && (
          <div className={styles.lobbyView}>
            <div className={styles.welcomeSection}>
              <h2>안녕하세요, {currentUser}님! 🎵</h2>
              <p>참여하고 싶은 음악실을 선택하거나 새로운 룸을 만들어보세요.</p>
              
              {hasError && (
                <div className={styles.errorMessage}>
                  ⚠️ {error}
                </div>
              )}
            </div>

            <ProjectGrid
              rooms={rooms}
              onJoinRoom={handleJoinRoom}
              onCreateRoom={handleCreateRoom}
              onViewRoomInfo={handleViewRoomInfo}
              currentUser={currentUser}
              isLoading={isLoading}
            />

            {/* 연결 상태 정보 */}
            <div className={styles.connectionInfo}>
              <div className={styles.infoCard}>
                <h3>연결 상태</h3>
                <p>서버: {isConnected ? '✅ 연결됨' : '❌ 연결 안됨'}</p>
                <p>재연결 시도: {connectionState.reconnectAttempts}회</p>
                {connectionState.connectedAt && (
                  <p>연결 시간: {connectionState.connectedAt.toLocaleTimeString()}</p>
                )}
              </div>

              <div className={styles.infoCard}>
                <h3>현재 상태</h3>
                <p>사용 가능한 룸: {rooms.length}개</p>
                <p>연결된 사용자: {connectedUsers.length}명</p>
                <p>현재 룸: {currentRoom ? currentRoom.name : '없음'}</p>
              </div>
            </div>
          </div>
        )}

        {/* 음악실 뷰 */}
        {currentView === 'room' && currentRoom && (
          <MusicRoomView
            room={currentRoom}
            currentUser={currentUser}
            connectedUsers={connectedUsers}
            onLeaveRoom={handleLeaveRoom}
            socket={socket}
          />
        )}

        {/* 프로필 뷰 */}
        {currentView === 'profile' && (
          <div className={styles.profileView}>
            <div className={styles.profilePlaceholder}>
              <h2>👤 사용자 프로필</h2>
              <p>여기에 사용자 프로필 컴포넌트가 표시됩니다.</p>
              <p>현재 사용자: <strong>{currentUser}</strong></p>
              <p>연결 상태: <strong>{isConnected ? '온라인' : '오프라인'}</strong></p>
              
              <div className={styles.profileStats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>참여한 룸</span>
                  <span className={styles.statValue}>3개</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>메시지 수</span>
                  <span className={styles.statValue}>127개</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>접속 시간</span>
                  <span className={styles.statValue}>2시간 15분</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 데모 뷰 */}
        {currentView === 'demo' && (
          <div className={styles.demoView}>
            <UserSystemDemo />
          </div>
        )}
      </main>

      {/* Socket.IO 에러 표시 */}
      {hasError && (
        <div className={styles.errorToast}>
          <span>⚠️ {error}</span>
          <button 
            onClick={() => window.location.reload()} 
            className={styles.retryBtn}
          >
            🔄 재시도
          </button>
        </div>
      )}
    </div>
  );
}