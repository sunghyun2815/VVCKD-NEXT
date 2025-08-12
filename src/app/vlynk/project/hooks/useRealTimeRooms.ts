'use client';
import { useEffect, useState, useCallback } from 'react';
import { useProjectSocket } from './useProjectSocket';
import type { MusicRoom, ChatMessage } from '../types/project.types';

interface UseRealTimeRoomsReturn {
  rooms: MusicRoom[];
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  refreshRooms: () => void;
  clearMessages: () => void;
}

export function useRealTimeRooms(userId: string): UseRealTimeRoomsReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const {
    socket,
    isConnected,
    rooms,
    error: socketError
  } = useProjectSocket(userId);

  // 로딩 상태 관리
  useEffect(() => {
    if (isConnected && rooms.length >= 0) {
      setIsLoading(false);
    }
  }, [isConnected, rooms]);

  // 채팅 메시지 수신 처리
  useEffect(() => {
    const handleChatMessage = (event: CustomEvent<ChatMessage>) => {
      const message = event.detail;
      setMessages(prev => [...prev, message]);
    };

    const handleVoiceMessage = (event: CustomEvent<ChatMessage>) => {
      const message = event.detail;
      setMessages(prev => [...prev, message]);
    };

    // CustomEvent 리스너 등록
    window.addEventListener('socketChatMessage', handleChatMessage as EventListener);
    window.addEventListener('socketVoiceMessage', handleVoiceMessage as EventListener);

    return () => {
      window.removeEventListener('socketChatMessage', handleChatMessage as EventListener);
      window.removeEventListener('socketVoiceMessage', handleVoiceMessage as EventListener);
    };
  }, []);

  // 룸 목록 새로고침
  const refreshRooms = useCallback(() => {
    if (socket && isConnected) {
      setIsLoading(true);
      socket.emit('get music room list');
    }
  }, [socket, isConnected]);

  // 메시지 목록 초기화
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    rooms,
    messages,
    isLoading,
    error: socketError,
    refreshRooms,
    clearMessages
  };
}