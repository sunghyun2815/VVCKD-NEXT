// src/app/vlynk/project/page.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import LoginModal from './components/LoginModal';
import ProjectGrid from './components/ProjectGrid';
import type { MusicRoom, ChatMessage, User } from './types/project.types';
import { useProjectSocket } from './hooks/useProjectSocket';
import styles from './project.module.css';

// 더미 데이터 (개발용)
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

export default function ProjectPage() {
  // ===== 상태 관리 =====
  const [currentUser, setCurrentUser] = useState<string>('');
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [rooms, setRooms] = useState<MusicRoom[]>(DUMMY_ROOMS);
  const [currentRoom, setCurrentRoom] = useState<MusicRoom | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Socket.IO 훅 사용
  const {
    socket,
    isConnected,
    connectedUsers,
    error: socketError
  } = useProjectSocket(currentUser);

  // ===== 이벤트 핸들러들 =====

  // 로그인 처리
  const handleLogin = useCallback((username: string) => {
    console.log('🔐 User login attempt:', username);
    setCurrentUser(username);
    setShowLoginModal(false);
    
    // 실제 서버 연결 시뮬레이션
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
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
    
    // Socket.IO를 통한 방 참가 (실제 구현)
    if (socket && isConnected) {
      socket.emit('join music room', { roomId });
    }

    // 임시 시뮬레이션
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
      
      setIsLoading(false);
      console.log('✅ Successfully joined room:', room.name);
      
      // TODO: 여기서 MusicRoomView 컴포넌트로 전환
      alert(`"${room.name}" 방에 입장했습니다!\n\n(MusicRoomView 컴포넌트를 다음에 구현할 예정)`);
    }, 1000);
  }, [rooms, socket, isConnected]);

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

    // Socket.IO를 통한 방 생성 (실제 구현)
    if (socket && isConnected) {
      socket.emit('create music room', newRoom);
    }

    // 임시 시뮬레이션
    setTimeout(() => {
      setRooms(prevRooms => [newRoom, ...prevRooms]);
      setCurrentRoom(newRoom);
      setIsLoading(false);
      
      console.log('✅ Room created successfully:', newRoom);
      alert(`"${roomName}" 방이 생성되었습니다!`);
    }, 1000);
  }, [currentUser, socket, isConnected]);

  // 방 정보 보기 처리
  const handleViewRoomInfo = useCallback((roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    alert(`
🎵 Room Information

Name: ${room.name}
Description: ${room.description}
Genres: ${room.genres.join(', ') || 'None'}
Participants: ${room.participants}/${room.maxUsers}
Music Tracks: ${room.musicCount}
Status: ${room.status.toUpperCase()}
Created: ${new Date(room.createdAt).toLocaleString()}
Creator: ${room.createdBy}
    `);
  }, [rooms]);

  // ===== 효과 =====

  // Socket.IO 연결 상태 모니터링
  useEffect(() => {
    if (socketError) {
      console.error('❌ Socket error:', socketError);
    }
    
    if (isConnected) {
      console.log('✅ Socket connected successfully');
    }
  }, [isConnected, socketError]);

  // 방 목록 업데이트 (Socket.IO 이벤트)
  useEffect(() => {
    if (socket && isConnected) {
      const handleRoomList = (serverRooms: MusicRoom[]) => {
        console.log('📝 Received room list from server:', serverRooms);
        setRooms(serverRooms);
      };

      const handleRoomCreated = (newRoom: MusicRoom) => {
        console.log('🆕 New room created:', newRoom);
        setRooms(prevRooms => [newRoom, ...prevRooms]);
      };

      socket.on('music room list', handleRoomList);
      socket.on('music room created', handleRoomCreated);

      return () => {
        socket.off('music room list', handleRoomList);
        socket.off('music room created', handleRoomCreated);
      };
    }
  }, [socket, isConnected]);

  // ===== 렌더링 =====

  return (
    <div className={styles.container}>
      {/* 로그인 모달 */}
      <LoginModal
        onLogin={handleLogin}
        isVisible={showLoginModal}
      />

      {/* 메인 콘텐츠 */}
      {!showLoginModal && (
        <>
          {currentRoom ? (
            // TODO: MusicRoomView 컴포넌트 (다음 단계에서 구현)
            <div className={styles.musicRoomPlaceholder}>
              <div className={styles.placeholderContent}>
                <h2>🎵 Music Room: {currentRoom.name}</h2>
                <p>MusicRoomView 컴포넌트가 여기에 들어갑니다.</p>
                <button 
                  onClick={() => setCurrentRoom(null)}
                  className={styles.backButton}
                >
                  ← BACK TO ROOM LIST
                </button>
              </div>
            </div>
          ) : (
            // 방 목록 그리드
            <ProjectGrid
              rooms={rooms}
              onJoinRoom={handleJoinRoom}
              onCreateRoom={handleCreateRoom}
              onViewRoomInfo={handleViewRoomInfo}
              currentUser={currentUser}
              isLoading={isLoading}
            />
          )}

          {/* 연결 상태 표시 */}
          {socketError && (
            <div className={styles.errorBanner}>
              ⚠️ Connection Error: {socketError}
            </div>
          )}
          
          {!isConnected && currentUser && (
            <div className={styles.statusBanner}>
              🔄 Connecting to server...
            </div>
          )}
        </>
      )}
    </div>
  );
}