'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// ===== 타입 정의 =====
export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  reconnectAttempts: number;
  connectedAt?: Date;
  lastError?: string;
  latency?: number;
}

export interface MusicRoom {
  id: string;
  name: string;
  description: string;
  genres: string[];
  maxUsers: number;
  participants: number;
  musicCount: number;
  status: 'active' | 'inactive' | 'development' | 'planning';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user' | 'guest';
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  user: string;
  message: string;
  timestamp: number;
  time: string;
  audioUrl?: string;
  type: 'text' | 'voice' | 'system';
}

export interface AudioFile {
  id: string;
  name: string;
  url: string;
  blob: Blob;
  duration: number;
  uploader: string;
  uploadedAt: string;
  size: number;
  type: string;
}

// ===== Socket.IO 이벤트 타입 =====
export interface ServerToClientEvents {
  // 연결 관련
  'connect': () => void;
  'disconnect': (reason: string) => void;
  'error': (error: string) => void;
  
  // 룸 관련
  'music_room_list': (rooms: MusicRoom[]) => void;
  'music_room_created': (room: MusicRoom) => void;
  'music_room_updated': (room: MusicRoom) => void;
  'music_room_deleted': (roomId: string) => void;
  'music_room_join_success': (data: { roomId: string; room: MusicRoom; users: User[] }) => void;
  'music_room_join_error': (data: { message: string }) => void;
  'music_room_user_joined': (user: User) => void;
  'music_room_user_left': (userId: string) => void;
  
  // 채팅 관련
  'music_chat_message': (message: ChatMessage) => void;
  'music_voice_message': (message: ChatMessage) => void;
  
  // 오디오 관련
  'audio_file_uploaded': (file: AudioFile) => void;
  'audio_file_deleted': (fileId: string) => void;
  'audio_playback_sync': (data: { time: number; isPlaying: boolean }) => void;
  
  // 시스템 관련
  'ping': (timestamp: number, callback: (response: number) => void) => void;
}

export interface ClientToServerEvents {
  // 사용자 관리
  'user_join': (data: { username: string }) => void;
  'user_leave': () => void;
  
  // 룸 관리
  'get_music_room_list': () => void;
  'create_music_room': (data: Omit<MusicRoom, 'id' | 'createdAt' | 'updatedAt'>) => void;
  'join_music_room': (data: { roomId: string }) => void;
  'leave_music_room': (data: { roomId: string }) => void;
  
  // 채팅
  'music_chat_message': (message: Omit<ChatMessage, 'id'>) => void;
  'music_voice_message': (message: Omit<ChatMessage, 'id'>) => void;
  
  // 오디오
  'upload_audio_file': (data: { file: ArrayBuffer; fileName: string; roomId: string }) => void;
  'sync_audio_playback': (data: { roomId: string; time: number; isPlaying: boolean }) => void;
  
  // 시스템
  'ping': (timestamp: number, callback: (response: number) => void) => void;
}

// ===== 메인 훅 =====
export function useVlynkSocket(username?: string) {
  // Socket 참조
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  
  // 연결 상태
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    reconnectAttempts: 0,
  });

  // 데이터 상태
  const [rooms, setRooms] = useState<MusicRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<MusicRoom | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);

  // 에러 상태
  const [error, setError] = useState<string | null>(null);

  // 환경 설정
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
  const MAX_RECONNECT_ATTEMPTS = 5;

  // ===== 연결 상태 업데이트 =====
  const updateConnectionState = useCallback((updates: Partial<ConnectionState>) => {
    setConnectionState(prev => ({ ...prev, ...updates }));
  }, []);

  // ===== Socket.IO 연결 =====
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('🔌 Socket already connected');
      return socketRef.current;
    }

    console.log('🔌 Connecting to VLYNK socket server:', SOCKET_URL);
    updateConnectionState({ status: 'connecting' });
    setError(null);

    // Socket 인스턴스 생성
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 10000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: username ? { username } : undefined,
    });

    const socket = socketRef.current;

    // ===== 기본 이벤트 리스너 =====
    socket.on('connect', () => {
      console.log('✅ VLYNK Socket connected:', socket.id);
      updateConnectionState({
        status: 'connected',
        reconnectAttempts: 0,
        connectedAt: new Date(),
        lastError: undefined,
      });

      // 사용자 등록
      if (username) {
        socket.emit('user_join', { username });
      }

      // 룸 목록 요청
      socket.emit('get_music_room_list');
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ VLYNK Socket disconnected:', reason);
      updateConnectionState({
        status: 'disconnected',
        connectedAt: undefined,
      });

      // 자동 재연결 처리
      if (reason === 'io server disconnect') {
        setTimeout(() => {
          if (socket && !socket.connected) {
            console.log('🔄 Attempting manual reconnection...');
            socket.connect();
          }
        }, 2000);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ VLYNK Socket connection error:', error);
      updateConnectionState({
        status: 'error',
        lastError: error.message,
        reconnectAttempts: connectionState.reconnectAttempts + 1,
      });
      setError(`연결 실패: ${error.message}`);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 VLYNK Socket reconnected after', attemptNumber, 'attempts');
      updateConnectionState({
        status: 'connected',
        reconnectAttempts: 0,
        lastError: undefined,
      });
      setError(null);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ VLYNK Socket reconnection failed');
      updateConnectionState({
        status: 'error',
        lastError: '재연결 실패',
      });
      setError('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
    });

    // ===== 룸 관련 이벤트 =====
    socket.on('music_room_list', (roomList) => {
      console.log('📋 Received room list:', roomList.length, 'rooms');
      setRooms(roomList);
    });

    socket.on('music_room_created', (room) => {
      console.log('🆕 Room created:', room.name);
      setRooms(prev => [...prev, room]);
    });

    socket.on('music_room_updated', (updatedRoom) => {
      console.log('📝 Room updated:', updatedRoom.name);
      setRooms(prev => prev.map(room => 
        room.id === updatedRoom.id ? updatedRoom : room
      ));
      
      if (currentRoom?.id === updatedRoom.id) {
        setCurrentRoom(updatedRoom);
      }
    });

    socket.on('music_room_deleted', (roomId) => {
      console.log('🗑️ Room deleted:', roomId);
      setRooms(prev => prev.filter(room => room.id !== roomId));
      
      if (currentRoom?.id === roomId) {
        setCurrentRoom(null);
        setConnectedUsers([]);
        setMessages([]);
        setAudioFiles([]);
      }
    });

    socket.on('music_room_join_success', ({ roomId, room, users }) => {
      console.log('✅ Successfully joined room:', room.name);
      setCurrentRoom(room);
      setConnectedUsers(users);
      setMessages([]); // 새 룸 입장시 메시지 초기화
      setError(null);
    });

    socket.on('music_room_join_error', ({ message }) => {
      console.error('❌ Failed to join room:', message);
      setError(message);
    });

    socket.on('music_room_user_joined', (user) => {
      console.log('👋 User joined room:', user.username);
      setConnectedUsers(prev => {
        const exists = prev.some(u => u.id === user.id);
        return exists ? prev : [...prev, user];
      });
    });

    socket.on('music_room_user_left', (userId) => {
      console.log('👋 User left room:', userId);
      setConnectedUsers(prev => prev.filter(user => user.id !== userId));
    });

    // ===== 채팅 관련 이벤트 =====
    socket.on('music_chat_message', (message) => {
      console.log('💬 Chat message received:', message);
      setMessages(prev => [...prev, message]);
    });

    socket.on('music_voice_message', (message) => {
      console.log('🎤 Voice message received:', message);
      setMessages(prev => [...prev, message]);
    });

    // ===== 오디오 관련 이벤트 =====
    socket.on('audio_file_uploaded', (file) => {
      console.log('🎵 Audio file uploaded:', file.name);
      setAudioFiles(prev => [...prev, file]);
    });

    socket.on('audio_file_deleted', (fileId) => {
      console.log('🗑️ Audio file deleted:', fileId);
      setAudioFiles(prev => prev.filter(file => file.id !== fileId));
    });

    socket.on('audio_playback_sync', (data) => {
      console.log('🎵 Audio playback sync:', data);
      // 여기서 오디오 플레이어 동기화 처리
    });

    return socket;
  }, [SOCKET_URL, username, connectionState.reconnectAttempts, updateConnectionState, currentRoom]);

  // ===== 연결 해제 =====
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting VLYNK socket');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    updateConnectionState({ status: 'disconnected' });
    setCurrentRoom(null);
    setConnectedUsers([]);
    setMessages([]);
    setAudioFiles([]);
  }, [updateConnectionState]);

  // ===== 재연결 =====
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  }, [connect, disconnect]);

  // ===== 룸 관리 함수들 =====
  const joinRoom = useCallback((roomId: string) => {
    if (!socketRef.current?.connected) {
      setError('서버에 연결되지 않았습니다.');
      return;
    }

    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      setError('존재하지 않는 룸입니다.');
      return;
    }

    if (room.participants >= room.maxUsers) {
      setError('룸이 가득 찼습니다.');
      return;
    }

    console.log('🚪 Joining room:', room.name);
    socketRef.current.emit('join_music_room', { roomId });
  }, [rooms]);

  const leaveRoom = useCallback(() => {
    if (!socketRef.current?.connected || !currentRoom) {
      return;
    }

    console.log('🚪 Leaving room:', currentRoom.name);
    socketRef.current.emit('leave_music_room', { roomId: currentRoom.id });
    setCurrentRoom(null);
    setConnectedUsers([]);
    setMessages([]);
    setAudioFiles([]);
  }, [currentRoom]);

  const createRoom = useCallback((roomData: Omit<MusicRoom, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!socketRef.current?.connected) {
      setError('서버에 연결되지 않았습니다.');
      return;
    }

    console.log('🆕 Creating room:', roomData.name);
    socketRef.current.emit('create_music_room', roomData);
  }, []);

  // ===== 채팅 함수들 =====
  const sendMessage = useCallback((message: string, timestamp?: number) => {
    if (!socketRef.current?.connected || !currentRoom || !username) {
      setError('메시지를 보낼 수 없습니다.');
      return;
    }

    const chatMessage: Omit<ChatMessage, 'id'> = {
      roomId: currentRoom.id,
      user: username,
      message,
      timestamp: timestamp || 0,
      time: new Date().toISOString(),
      type: 'text',
    };

    console.log('💬 Sending message:', message);
    socketRef.current.emit('music_chat_message', chatMessage);
  }, [currentRoom, username]);

  const sendVoiceMessage = useCallback((audioUrl: string, timestamp?: number) => {
    if (!socketRef.current?.connected || !currentRoom || !username) {
      setError('음성 메시지를 보낼 수 없습니다.');
      return;
    }

    const voiceMessage: Omit<ChatMessage, 'id'> = {
      roomId: currentRoom.id,
      user: username,
      message: '음성 메시지',
      timestamp: timestamp || 0,
      time: new Date().toISOString(),
      audioUrl,
      type: 'voice',
    };

    console.log('🎤 Sending voice message');
    socketRef.current.emit('music_voice_message', voiceMessage);
  }, [currentRoom, username]);

  // ===== 오디오 파일 업로드 =====
  const uploadAudioFile = useCallback(async (file: File) => {
    if (!socketRef.current?.connected || !currentRoom) {
      setError('파일을 업로드할 수 없습니다.');
      return;
    }

    try {
      console.log('📤 Uploading audio file:', file.name);
      const arrayBuffer = await file.arrayBuffer();
      
      socketRef.current.emit('upload_audio_file', {
        file: arrayBuffer,
        fileName: file.name,
        roomId: currentRoom.id,
      });
    } catch (error) {
      console.error('❌ File upload error:', error);
      setError('파일 업로드에 실패했습니다.');
    }
  }, [currentRoom]);

  // ===== 지연시간 측정 =====
  const measureLatency = useCallback((): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const start = performance.now();
      
      socketRef.current.emit('ping', start, (response: number) => {
        const latency = performance.now() - response;
        updateConnectionState({ latency });
        resolve(latency);
      });

      setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);
    });
  }, [updateConnectionState]);

  // ===== 초기화 및 정리 =====
  useEffect(() => {
    if (username) {
      connect();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
    };
  }, [username, connect]);

  // ===== 페이지 가시성 최적화 =====
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 페이지가 숨겨졌을 때 - 연결 유지하되 최적화
        if (socketRef.current) {
          socketRef.current.io.opts.transports = ['websocket'];
        }
      } else {
        // 페이지가 다시 보일 때 - 정상 모드 복귀
        if (socketRef.current) {
          socketRef.current.io.opts.transports = ['websocket', 'polling'];
          if (!socketRef.current.connected) {
            socketRef.current.connect();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ===== 반환값 =====
  return {
    // Socket 인스턴스
    socket: socketRef.current,
    
    // 연결 상태
    connectionState,
    isConnected: connectionState.status === 'connected',
    isConnecting: connectionState.status === 'connecting',
    isReconnecting: connectionState.status === 'reconnecting',
    hasError: connectionState.status === 'error',
    error,
    
    // 데이터
    rooms,
    currentRoom,
    connectedUsers,
    messages,
    audioFiles,
    
    // 연결 제어
    connect,
    disconnect,
    reconnect,
    
    // 룸 관리
    joinRoom,
    leaveRoom,
    createRoom,
    
    // 채팅
    sendMessage,
    sendVoiceMessage,
    
    // 오디오
    uploadAudioFile,
    
    // 유틸리티
    measureLatency,
  };
}