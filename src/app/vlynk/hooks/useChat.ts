'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVlynkSocket } from './useVlynkSocket';
import type { 
  VlynkMessage, 
  VlynkRoom, 
  VlynkUser,
  VlynkFileAttachment,
  VLYNK_CONSTANTS 
} from '../types/vlynk.types';

interface ChatState {
  messages: VlynkMessage[];
  currentRoom: VlynkRoom | null;
  typingUsers: Set<string>;
  onlineUsers: Set<string>;
  roomUserCount: number;
  roomMaxUsers?: number;
  isLoadingMessages: boolean;
  hasMoreMessages: boolean;
}

interface SendMessageOptions {
  type?: VlynkMessage['type'];
  fileData?: VlynkFileAttachment;
  mentions?: string[];
  replyTo?: string;
}

/**
 * VLYNK 채팅 기능을 관리하는 전문가급 훅
 * 메시지 송수신, 타이핑 인디케이터, 파일 전송 등을 처리
 */
export function useChat() {
  const { emit, on, off, isConnected } = useVlynkSocket();
  
  // 채팅 상태
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    currentRoom: null,
    typingUsers: new Set(),
    onlineUsers: new Set(),
    roomUserCount: 0,
    isLoadingMessages: false,
    hasMoreMessages: true,
  });

  // 타이핑 타이머 관리
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingTimeRef = useRef<number>(0);
  const isTypingRef = useRef<boolean>(false);

  // 메시지 로딩 상태
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef<boolean>(true);

  // 채팅 상태 업데이트 헬퍼
  const updateChatState = useCallback((updates: Partial<ChatState>) => {
    setChatState(prev => ({ ...prev, ...updates }));
  }, []);

  // 메시지 추가 (중복 방지 포함)
  const addMessage = useCallback((newMessage: VlynkMessage) => {
    setChatState(prev => {
      // 중복 메시지 체크
      const existingIndex = prev.messages.findIndex(m => m.id === newMessage.id);
      
      if (existingIndex !== -1) {
        // 기존 메시지 업데이트
        const updatedMessages = [...prev.messages];
        updatedMessages[existingIndex] = { ...updatedMessages[existingIndex], ...newMessage };
        return { ...prev, messages: updatedMessages };
      } else {
        // 새 메시지 추가 (시간순 정렬 유지)
        const insertIndex = prev.messages.findIndex(m => 
          new Date(m.timestamp).getTime() > new Date(newMessage.timestamp).getTime()
        );
        
        if (insertIndex === -1) {
          // 가장 최신 메시지
          return { ...prev, messages: [...prev.messages, newMessage] };
        } else {
          // 중간에 삽입
          const updatedMessages = [...prev.messages];
          updatedMessages.splice(insertIndex, 0, newMessage);
          return { ...prev, messages: updatedMessages };
        }
      }
    });

    // 자동 스크롤 처리
    if (isAutoScrollRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  // 메시지 제거
  const removeMessage = useCallback((messageId: string) => {
    updateChatState({
      messages: chatState.messages.filter(m => m.id !== messageId)
    });
  }, [chatState.messages, updateChatState]);

  // 메시지 전송
  const sendMessage = useCallback(async (
    content: string, 
    options: SendMessageOptions = {}
  ): Promise<boolean> => {
    if (!isConnected || !chatState.currentRoom) {
      console.warn('⚠️ Cannot send message: Not connected or no room selected');
      return false;
    }

    const trimmedContent = content.trim();
    
    // 빈 메시지 체크 (파일이 없는 경우)
    if (!trimmedContent && !options.fileData) {
      console.warn('⚠️ Cannot send empty message');
      return false;
    }

    // 메시지 길이 체크
    if (trimmedContent.length > VLYNK_CONSTANTS.MAX_MESSAGE_LENGTH) {
      console.warn('⚠️ Message too long:', trimmedContent.length);
      return false;
    }

    try {
      // 메시지 전송
      const success = emit('chat message', {
        roomName: chatState.currentRoom.name,
        message: trimmedContent,
        fileData: options.fileData,
      });

      if (success) {
        console.log('📤 Message sent successfully');
        // 타이핑 중지
        stopTyping();
        return true;
      } else {
        console.error('❌ Failed to send message');
        return false;
      }
    } catch (error) {
      console.error('💥 Error sending message:', error);
      return false;
    }
  }, [isConnected, chatState.currentRoom, emit]);

  // 메시지 삭제
  const deleteMessage = useCallback((messageId: string): boolean => {
    if (!isConnected || !chatState.currentRoom) {
      console.warn('⚠️ Cannot delete message: Not connected or no room selected');
      return false;
    }

    try {
      const success = emit('delete message', {
        roomName: chatState.currentRoom.name,
        messageId,
      });

      if (success) {
        console.log('🗑️ Delete message request sent:', messageId);
        return true;
      } else {
        console.error('❌ Failed to send delete request');
        return false;
      }
    } catch (error) {
      console.error('💥 Error deleting message:', error);
      return false;
    }
  }, [isConnected, chatState.currentRoom, emit]);

  // 타이핑 시작
  const startTyping = useCallback(() => {
    if (!isConnected || !chatState.currentRoom || isTypingRef.current) {
      return;
    }

    const now = Date.now();
    
    // 너무 자주 보내지 않도록 throttling
    if (now - lastTypingTimeRef.current < 1000) {
      return;
    }

    try {
      emit('typing start', {
        roomName: chatState.currentRoom.name,
        username: 'currentUser', // 실제로는 현재 사용자명을 사용
      });

      isTypingRef.current = true;
      lastTypingTimeRef.current = now;

      console.log('⌨️ Started typing');

      // 자동으로 타이핑 중지 설정
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, VLYNK_CONSTANTS.TYPING_TIMEOUT);
    } catch (error) {
      console.error('💥 Error starting typing:', error);
    }
  }, [isConnected, chatState.currentRoom, emit]);

  // 타이핑 중지
  const stopTyping = useCallback(() => {
    if (!isConnected || !chatState.currentRoom || !isTypingRef.current) {
      return;
    }

    try {
      emit('typing stop', {
        roomName: chatState.currentRoom.name,
        username: 'currentUser', // 실제로는 현재 사용자명을 사용
      });

      isTypingRef.current = false;
      console.log('⌨️ Stopped typing');

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    } catch (error) {
      console.error('💥 Error stopping typing:', error);
    }
  }, [isConnected, chatState.currentRoom, emit]);

  // 방 입장
  const joinRoom = useCallback((room: VlynkRoom, password?: string): boolean => {
    if (!isConnected) {
      console.warn('⚠️ Cannot join room: Not connected');
      return false;
    }

    try {
      const success = emit('join room', {
        roomName: room.name,
        password,
      });

      if (success) {
        console.log('🚪 Join room request sent:', room.name);
        return true;
      } else {
        console.error('❌ Failed to send join room request');
        return false;
      }
    } catch (error) {
      console.error('💥 Error joining room:', error);
      return false;
    }
  }, [isConnected, emit]);

  // 방 나가기
  const leaveRoom = useCallback((): boolean => {
    if (!isConnected || !chatState.currentRoom) {
      console.warn('⚠️ Cannot leave room: Not connected or no room selected');
      return false;
    }

    try {
      const success = emit('leave room', {
        roomName: chatState.currentRoom.name,
      });

      if (success) {
        console.log('🚪 Leave room request sent:', chatState.currentRoom.name);
        
        // 로컬 상태 초기화
        updateChatState({
          messages: [],
          currentRoom: null,
          typingUsers: new Set(),
          roomUserCount: 0,
          roomMaxUsers: undefined,
        });

        // 타이핑 정리
        stopTyping();
        
        return true;
      } else {
        console.error('❌ Failed to send leave room request');
        return false;
      }
    } catch (error) {
      console.error('💥 Error leaving room:', error);
      return false;
    }
  }, [isConnected, chatState.currentRoom, emit, updateChatState, stopTyping]);

  // 스크롤 위치 추적
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    isAutoScrollRef.current = isNearBottom;
  }, []);

  // 소켓 이벤트 리스너들
  useEffect(() => {
    if (!isConnected) return;

    // 메시지 수신
    const handleMessageReceived = (message: VlynkMessage) => {
      console.log('📨 Message received:', message);
      addMessage(message);
    };

    // 메시지 삭제 성공
    const handleMessageDeleted = (data: { messageId: string }) => {
      console.log('🗑️ Message deleted:', data.messageId);
      removeMessage(data.messageId);
    };

    // 삭제 에러
    const handleDeleteError = (data: { message: string }) => {
      console.error('❌ Delete error:', data.message);
      // 에러 토스트 표시 등의 처리
    };

    // 방 입장 성공
    const handleRoomJoinSuccess = (data: { roomName: string; userCount: number; maxUsers?: number }) => {
      console.log('✅ Successfully joined room:', data);
      
      const room: VlynkRoom = {
        id: data.roomName, // 임시로 name을 id로 사용
        name: data.roomName,
        creator: 'unknown',
        participants: [],
        maxUsers: data.maxUsers || VLYNK_CONSTANTS.DEFAULT_MAX_USERS,
        hasPassword: false,
        isPrivate: false,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        tags: [],
        type: 'text',
      };

      updateChatState({
        currentRoom: room,
        messages: [], // 새 방이므로 메시지 초기화
        roomUserCount: data.userCount,
        roomMaxUsers: data.maxUsers,
        typingUsers: new Set(),
      });
    };

    // 방 입장 실패
    const handleRoomJoinError = (data: { message: string }) => {
      console.error('❌ Room join error:', data.message);
      // 에러 토스트 표시
    };

    // 사용자 수 업데이트
    const handleRoomUserCount = (data: { count: number; maxUsers?: number }) => {
      console.log('👥 Room user count updated:', data);
      updateChatState({
        roomUserCount: data.count,
        roomMaxUsers: data.maxUsers,
      });
    };

    // 사용자 입장 알림
    const handleUserJoined = (data: { username: string; userCount: number }) => {
      console.log('👋 User joined:', data.username);
      updateChatState({
        roomUserCount: data.userCount,
      });
    };

    // 사용자 퇴장 알림
    const handleUserLeft = (data: { username: string; userCount: number }) => {
      console.log('👋 User left:', data.username);
      updateChatState({
        roomUserCount: data.userCount,
      });
    };

    // 타이핑 인디케이터
    const handleUserTyping = (data: { username: string; roomName: string }) => {
      if (data.roomName === chatState.currentRoom?.name && data.username !== 'currentUser') {
        setChatState(prev => ({
          ...prev,
          typingUsers: new Set([...prev.typingUsers, data.username])
        }));

        // 3초 후 자동 제거
        setTimeout(() => {
          setChatState(prev => {
            const newTypingUsers = new Set(prev.typingUsers);
            newTypingUsers.delete(data.username);
            return { ...prev, typingUsers: newTypingUsers };
          });
        }, VLYNK_CONSTANTS.TYPING_TIMEOUT);
      }
    };

    // 이벤트 리스너 등록
    on('chat message', handleMessageReceived);
    on('message deleted', handleMessageDeleted);
    on('delete error', handleDeleteError);
    on('room join success', handleRoomJoinSuccess);
    on('room join error', handleRoomJoinError);
    on('room user count', handleRoomUserCount);
    on('user joined room', handleUserJoined);
    on('user left room', handleUserLeft);
    on('user typing', handleUserTyping);

    // 정리 함수
    return () => {
      off('chat message', handleMessageReceived);
      off('message deleted', handleMessageDeleted);
      off('delete error', handleDeleteError);
      off('room join success', handleRoomJoinSuccess);
      off('room join error', handleRoomJoinError);
      off('room user count', handleRoomUserCount);
      off('user joined room', handleUserJoined);
      off('user left room', handleUserLeft);
      off('user typing', handleUserTyping);
    };
  }, [isConnected, chatState.currentRoom?.name, on, off, addMessage, removeMessage, updateChatState]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping();
    };
  }, [stopTyping]);

  return {
    // 상태
    messages: chatState.messages,
    currentRoom: chatState.currentRoom,
    typingUsers: Array.from(chatState.typingUsers),
    onlineUsers: Array.from(chatState.onlineUsers),
    roomUserCount: chatState.roomUserCount,
    roomMaxUsers: chatState.roomMaxUsers,
    isLoadingMessages: chatState.isLoadingMessages,
    hasMoreMessages: chatState.hasMoreMessages,

    // 액션
    sendMessage,
    deleteMessage,
    joinRoom,
    leaveRoom,
    
    // 타이핑
    startTyping,
    stopTyping,
    isTyping: isTypingRef.current,
    
    // 유틸리티
    handleScroll,
    messagesEndRef,
    
    // 상태 업데이트 (고급 사용을 위해)
    updateChatState,
    addMessage,
    removeMessage,
  };
}