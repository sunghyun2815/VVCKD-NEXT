'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { socketManager } from '../lib/socket';
import type { 
  MusicRoom, 
  ChatMessage, 
  User, 
  UseProjectSocketReturn,
  SocketIOClient 
} from '../types/project.types';

export function useProjectSocket(userId: string): UseProjectSocketReturn {
  // 상태 관리
  const [socket, setSocket] = useState<SocketIOClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rooms, setRooms] = useState<MusicRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<MusicRoom | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // 이벤트 리스너 정리를 위한 참조
  const eventListenersRef = useRef<{ [key: string]: (...args: any[]) => void }>({});

  // Socket.IO 연결 초기화
  useEffect(() => {
    if (!userId || userId === 'GUEST') {
      return;
    }

    const connectSocket = () => {
      try {
        const socketInstance = socketManager.connect(userId);
        setSocket(socketInstance);
        setupEventListeners(socketInstance);
      } catch (err) {
        setError('Socket.IO 연결 실패');
        console.error('❌ Socket connection failed:', err);
      }
    };

    connectSocket();

    // 컴포넌트 언마운트 시 정리
    return () => {
      cleanupEventListeners();
      // 주의: 여기서 disconnect하면 다른 컴포넌트에서도 연결이 끊어짐
      // socketManager.disconnect();
    };
  }, [userId]);

  // 이벤트 리스너 설정
  const setupEventListeners = useCallback((socketInstance: SocketIOClient) => {
    // 기존 리스너 정리
    cleanupEventListeners();

    // 연결 상태 이벤트
    const handleConnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setError(null);
      console.log('✅ Project Socket Connected');
      
      // 연결 후 룸 목록 요청
      socketInstance.emit('get music room list');
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      console.warn('⚠️ Project Socket Disconnected:', reason);
      
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setIsReconnecting(true);
      }
    };

    const handleConnectError = (error: Error) => {
      setError(`연결 오류: ${error.message}`);
      setIsReconnecting(false);
      console.error('❌ Project Socket Error:', error);
    };

    // 룸 관련 이벤트
    const handleRoomList = (roomList: MusicRoom[]) => {
      setRooms(roomList);
      console.log('📋 Received room list:', roomList.length, 'rooms');
    };

    const handleRoomCreated = (room: MusicRoom) => {
      setRooms(prev => {
        // 중복 방지
        const exists = prev.find(r => r.id === room.id);
        if (exists) return prev;
        
        return [...prev, room];
      });
      console.log('✅ Room created:', room.name);
    };

    const handleRoomUpdated = (updatedRoom: MusicRoom) => {
      setRooms(prev => 
        prev.map(room => 
          room.id === updatedRoom.id ? updatedRoom : room
        )
      );
      
      // 현재 룸이 업데이트된 경우
      if (currentRoom?.id === updatedRoom.id) {
        setCurrentRoom(updatedRoom);
      }
      
      console.log('🔄 Room updated:', updatedRoom.name);
    };

    const handleRoomDeleted = (roomId: string) => {
      setRooms(prev => prev.filter(room => room.id !== roomId));
      
      // 현재 룸이 삭제된 경우
      if (currentRoom?.id === roomId) {
        setCurrentRoom(null);
      }
      
      console.log('🗑️ Room deleted:', roomId);
    };

    const handleRoomJoinSuccess = (data: { roomId: string; room: MusicRoom; users: User[] }) => {
      setCurrentRoom(data.room);
      setConnectedUsers(data.users);
      console.log('✅ Joined room successfully:', data.room.name);
    };

    const handleRoomJoinError = (data: { message: string }) => {
      setError(`룸 입장 실패: ${data.message}`);
      console.error('❌ Room join failed:', data.message);
    };

    const handleUserJoined = (user: User) => {
      setConnectedUsers(prev => {
        // 중복 방지
        const exists = prev.find(u => u.id === user.id);
        if (exists) return prev;
        
        return [...prev, user];
      });
      console.log('👋 User joined:', user.username);
    };

    const handleUserLeft = (userId: string) => {
      setConnectedUsers(prev => prev.filter(user => user.id !== userId));
      console.log('👋 User left:', userId);
    };

    // 채팅 관련 이벤트
    const handleChatMessage = (message: ChatMessage) => {
      // 채팅 메시지는 상위 컴포넌트에서 처리하도록 이벤트 전달
      window.dispatchEvent(new CustomEvent('socketChatMessage', { detail: message }));
      console.log('💬 Chat message received:', message);
    };

    const handleVoiceMessage = (message: ChatMessage) => {
      // 음성 메시지는 상위 컴포넌트에서 처리하도록 이벤트 전달
      window.dispatchEvent(new CustomEvent('socketVoiceMessage', { detail: message }));
      console.log('🎤 Voice message received:', message);
    };

    // 이벤트 리스너 등록
    const listeners = {
      connect: handleConnect,
      disconnect: handleDisconnect,
      connect_error: handleConnectError,
      'music room list': handleRoomList,
      'music room created': handleRoomCreated,
      'music room updated': handleRoomUpdated,
      'music room deleted': handleRoomDeleted,
      'music room join success': handleRoomJoinSuccess,
      'music room join error': handleRoomJoinError,
      'music room user joined': handleUserJoined,
      'music room user left': handleUserLeft,
      'music chat message': handleChatMessage,
      'music voice message': handleVoiceMessage
    };

    // 리스너 등록 및 참조 저장
    Object.entries(listeners).forEach(([event, handler]) => {
      socketInstance.on(event as any, handler);
      eventListenersRef.current[event] = handler;
    });

  }, [currentRoom]);

  // 이벤트 리스너 정리
  const cleanupEventListeners = useCallback(() => {
    if (socket && eventListenersRef.current) {
      Object.entries(eventListenersRef.current).forEach(([event, handler]) => {
        socket.off(event as any, handler);
      });
      eventListenersRef.current = {};
    }
  }, [socket]);

  // 룸 입장
  const joinRoom = useCallback((roomId: string) => {
    if (!socket || !isConnected) {
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

    socket.emit('join music room', { roomId });
    console.log('🚪 Requesting to join room:', roomId);
  }, [socket, isConnected, rooms]);

  // 룸 나가기
  const leaveRoom = useCallback(() => {
    if (!socket || !isConnected || !currentRoom) {
      return;
    }

    socket.emit('leave music room', { roomId: currentRoom.id });
    setCurrentRoom(null);
    setConnectedUsers([]);
    console.log('🚪 Left room:', currentRoom.name);
  }, [socket, isConnected, currentRoom]);

  // 룸 생성
  const createRoom = useCallback((roomData: Omit<MusicRoom, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!socket || !isConnected) {
      setError('서버에 연결되지 않았습니다.');
      return;
    }

    if (!roomData.name || roomData.name.trim().length < 2) {
      setError('룸 이름은 2글자 이상이어야 합니다.');
      return;
    }

    const createData = {
      ...roomData,
      name: roomData.name.trim(),
      createdBy: userId
    };

    socket.emit('create music room', createData);
    console.log('🏠 Creating room:', createData.name);
  }, [socket, isConnected, userId]);

  // 메시지 전송
  const sendMessage = useCallback((message: Omit<ChatMessage, 'id' | 'time'>) => {
    if (!socket || !isConnected || !currentRoom) {
      setError('룸에 입장한 후 메시지를 보낼 수 있습니다.');
      return;
    }

    const messageData: Omit<ChatMessage, 'id'> = {
      ...message,
      roomId: currentRoom.id,
      time: new Date().toISOString()
    };

    socket.emit('music chat message', messageData);
    console.log('💬 Sending message:', messageData);
  }, [socket, isConnected, currentRoom]);

  // 음성 메시지 전송
  const sendVoiceMessage = useCallback((audioBlob: Blob, timestamp: number) => {
    if (!socket || !isConnected || !currentRoom) {
      setError('룸에 입장한 후 음성 메시지를 보낼 수 있습니다.');
      return;
    }

    // 실제 구현에서는 audioBlob을 서버에 업로드하고 URL을 받아야 함
    // 여기서는 임시로 로컬 URL 생성
    const audioUrl = URL.createObjectURL(audioBlob);

    const voiceData: Omit<ChatMessage, 'id'> = {
      roomId: currentRoom.id,
      user: userId,
      message: '[음성 메시지]',
      timestamp,
      time: new Date().toISOString(),
      audioUrl,
      type: 'voice'
    };

    socket.emit('music voice message', voiceData);
    console.log('🎤 Sending voice message:', voiceData);
  }, [socket, isConnected, currentRoom, userId]);

  // 수동 재연결
  const reconnect = useCallback(() => {
    if (socket && !isConnected) {
      setIsReconnecting(true);
      socket.connect();
    }
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    rooms,
    currentRoom,
    connectedUsers,
    joinRoom,
    leaveRoom,
    createRoom,
    sendMessage,
    sendVoiceMessage,
    error,
    isReconnecting,
    reconnect
  };
}