// src/app/vlynk/project/page.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import LoginModal from './components/LoginModal';
import ProjectGrid from './components/ProjectGrid';
import MusicRoomView from './components/MusicRoomView';
import type { MusicRoom, ChatMessage, User } from './types/project.types';
import { useProjectSocket } from './hooks/useProjectSocket';
import styles from './project.module.css';

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

// 더미 연결된 사용자들
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
  }
];

export default function ProjectPage() {
  // ===== 상태 관리 =====
  const [currentUser, setCurrentUser] = useState<string>('');
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [rooms, setRooms] = useState<MusicRoom[]>(DUMMY_ROOMS);
  const [currentRoom, setCurrentRoom] = useState<MusicRoom | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Socket.IO 훅 사용
  const {
    socket,
    isConnected,
    error: socketError
  } = useProjectSocket(currentUser);

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
    }, 1000);
  }, [rooms, socket, isConnected]);

  // 방 나가기 처리
  const handleLeaveRoom = useCallback(() => {
    if (!currentRoom) return;
    
    console.log('🚪 Leaving room:', currentRoom.name);
    
    // Socket.IO를 통한 방 나가기
    if (socket && isConnected) {
      socket.emit('leave music room', { roomId: currentRoom.id });
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
  }, [currentRoom, socket, isConnected]);

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
            // 음악 룸 뷰
            <MusicRoomView
              room={currentRoom}
              currentUser={currentUser}
              connectedUsers={connectedUsers}
              onLeaveRoom={handleLeaveRoom}
              socket={socket}
            />
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
          
          {!isConnected && currentUser && !currentRoom && (
            <div className={styles.statusBanner}>
              🔄 Connecting to server...
            </div>
          )}
        </>
      )}
    </div>
  );
}