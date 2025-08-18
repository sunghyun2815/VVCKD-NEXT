'use client';

import React, { useState, useCallback } from 'react';
import LoginModal from './components/LoginModal';
import ProjectGrid from './components/ProjectGrid';
import MusicRoomView from './components/MusicRoomView';
import ChatRoomView from './components/ChatRoomView';
import UserProfile from './components/UserProfile';
import { useVlynkSocket } from '../hooks/useVlynkSocket';
import type { 
  MusicRoom, 
  ChatMessage, 
  User 
} from './types/project.types';
import styles from './project.module.css';

// ===== 더미 사용자 생성 함수 =====
const generateConnectedUsers = (currentUser: string): User[] => [
  {
    id: 'user-1',
    username: currentUser,
    role: 'admin',
    joinedAt: new Date().toISOString()
  }
];

// ===== 메인 컴포넌트 =====
export default function ProjectPage() {
  // ===== 상태 관리 =====
  const [currentUser, setCurrentUser] = useState<string>('');
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [currentRoom, setCurrentRoom] = useState<MusicRoom | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'lobby' | 'musicRoom' | 'chatRoom' | 'profile'>('lobby');

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

  // 음악 룸 참가 처리
  const handleJoinMusicRoom = useCallback((roomId: string) => {
    console.log('🎵 Attempting to join music room:', roomId);
    
    const room = socketRooms.find(r => r.id === roomId);
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
      setCurrentView('musicRoom');
      setIsLoading(false);
      console.log('✅ Successfully joined music room:', room.name);
    }, 1000);
  }, [socketRooms, socket, isConnected, socketJoinRoom]);

  // 채팅 룸 참가 처리
  const handleJoinChatRoom = useCallback((roomId: string) => {
    console.log('💬 Attempting to join chat room:', roomId);
    setCurrentView('chatRoom');
  }, []);

  // 방 나가기 처리
  const handleLeaveRoom = useCallback(() => {
    if (!currentRoom) return;
    
    console.log('🚪 Leaving room:', currentRoom.name);
    
    // Socket.IO를 통한 방 나가기
    if (socket && isConnected) {
      socketLeaveRoom();
    }
    
    setCurrentRoom(null);
    setCurrentView('lobby');
    console.log('✅ Successfully left room');
  }, [currentRoom, socket, isConnected, socketLeaveRoom]);

  // 룸 생성 처리
  const handleCreateRoom = useCallback((roomData: Partial<MusicRoom>) => {
    console.log('🚀 Creating new room:', roomData);
    
    if (socket && isConnected) {
      socketCreateRoom({
        name: roomData.name || 'New Room',
        description: roomData.description || '',
        genres: roomData.genres || [],
        maxUsers: roomData.maxUsers || 10,
        participants: 0,
        musicCount: 0,
        status: 'active',
        createdBy: currentUser
      } as Omit<MusicRoom, 'id' | 'createdAt' | 'updatedAt'>);
    }
  }, [socket, isConnected, socketCreateRoom, currentUser]);

  // 프로필 보기
  const handleViewProfile = useCallback(() => {
    setCurrentView('profile');
  }, []);

  // 로비로 돌아가기
  const handleBackToLobby = useCallback(() => {
    setCurrentView('lobby');
  }, []);

  // ===== 로딩 중 처리 =====
  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p>VLYNK에 연결 중...</p>
        </div>
      </div>
    );
  }

  // ===== 렌더링 =====
  return (
    <div className={styles.pageContainer}>
      {/* 로그인 모달 */}
      {showLoginModal && (
        <LoginModal
          onLogin={handleLogin}
          isVisible={showLoginModal}
        />
      )}

      {/* 메인 헤더 */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerTitle}>
            🎵 VLYNK
            <span className={styles.cursor}>_</span>
          </h1>
          <div className={styles.connectionStatus}>
            <span className={`${styles.statusDot} ${isConnected ? styles.online : styles.offline}`}></span>
            <span>{isConnected ? '온라인' : '오프라인'}</span>
            {connectionState.latency && (
              <span className={styles.latency}>{connectionState.latency}ms</span>
            )}
          </div>
        </div>
        
        <div className={styles.headerRight}>
          <div className={styles.userInfo}>
            <span className={styles.username}>{currentUser}</span>
            <span className={styles.userRole}>사용자</span>
          </div>
          
          <div className={styles.headerActions}>
            {currentView !== 'lobby' && (
              <button
                onClick={handleBackToLobby}
                className={styles.backBtn}
              >
                ← 로비
              </button>
            )}
            
            <button
              onClick={handleViewProfile}
              className={styles.profileBtn}
            >
              👤 프로필
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
              <h2>VLYNK 음악 협업 플랫폼에 오신 것을 환영합니다!</h2>
              <p>실시간으로 음악을 공유하고, 채팅하며, 함께 창작해보세요.</p>
            </div>

            <ProjectGrid
              rooms={socketRooms}
              onJoinRoom={handleJoinMusicRoom}
              onCreateRoom={handleCreateRoom}
              onViewRoomInfo={(roomId) => console.log('View room info:', roomId)}
              currentUser={currentUser}
              isLoading={isConnecting}
            />

            {/* 연결 정보 */}
            <div className={styles.connectionInfo}>
              <div className={styles.infoCard}>
                <h3>서버 연결 상태</h3>
                <p>상태: {isConnected ? '✅ 연결됨' : '❌ 연결 안됨'}</p>
                <p>재연결 시도: {connectionState.reconnectAttempts}회</p>
                {connectionState.connectedAt && (
                  <p>연결 시간: {new Date(connectionState.connectedAt).toLocaleTimeString()}</p>
                )}
              </div>
              
              <div className={styles.infoCard}>
                <h3>룸 통계</h3>
                <p>전체 룸: {socketRooms.length}개</p>
                <p>활성 룸: {socketRooms.filter(r => r.status === 'active').length}개</p>
                <p>전체 참가자: {socketRooms.reduce((sum, r) => sum + r.participants, 0)}명</p>
              </div>
            </div>
          </div>
        )}

        {/* 음악 룸 뷰 */}
        {currentView === 'musicRoom' && currentRoom && (
          <MusicRoomView
            room={currentRoom}
            currentUser={currentUser}
            connectedUsers={socketUsers}
            onLeaveRoom={handleLeaveRoom}
            socket={socket}
          />
        )}

        {/* 채팅 룸 뷰 */}
        {currentView === 'chatRoom' && (
          <ChatRoomView
            currentUser={currentUser}
            onLeaveRoom={handleLeaveRoom}
            socket={socket}
          />
        )}

        {/* 프로필 뷰 */}
        {currentView === 'profile' && (
          <div className={styles.profileView}>
            <div className={styles.profilePlaceholder}>
              <h2>사용자 프로필</h2>
              <p><strong>사용자명:</strong> {currentUser}</p>
              <p><strong>상태:</strong> {isConnected ? '온라인' : '오프라인'}</p>
              
              <div className={styles.profileStats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>참여한 룸</span>
                  <span className={styles.statValue}>0개</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>메시지 수</span>
                  <span className={styles.statValue}>0개</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>접속 시간</span>
                  <span className={styles.statValue}>방금 전</span>
                </div>
              </div>
            </div>
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