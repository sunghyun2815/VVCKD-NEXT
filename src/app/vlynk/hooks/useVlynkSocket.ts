'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { 
  VlynkServerToClientEvents, 
  VlynkClientToServerEvents,
  ConnectionStatus,
  VlynkConnectionState
} from '../types/vlynk.types';

// 환경변수 설정
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 1000; // 1초

/**
 * VLYNK 전용 Socket.IO 훅
 * 연결 관리, 재연결 로직, 에러 처리 등을 담당
 */
export function useVlynkSocket() {
  const socketRef = useRef<Socket<VlynkServerToClientEvents, VlynkClientToServerEvents> | null>(null);
  
  // 연결 상태 관리
  const [connectionState, setConnectionState] = useState<VlynkConnectionState>({
    status: 'disconnected',
    reconnectAttempts: 0,
  });

  const [isInitialized, setIsInitialized] = useState(false);

  // 연결 상태 업데이트 헬퍼
  const updateConnectionState = useCallback((updates: Partial<VlynkConnectionState>) => {
    setConnectionState(prev => ({ ...prev, ...updates }));
  }, []);

  // 소켓 연결 함수
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('🔌 Socket already connected');
      return;
    }

    console.log('🔌 Connecting to VLYNK socket server...');
    updateConnectionState({ status: 'connecting' });

    // 소켓 인스턴스 생성
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_DELAY_BASE,
      reconnectionDelayMax: 5000,
      maxHttpBufferSize: 1e6, // 1MB
    });

    const socket = socketRef.current;

    // 연결 성공
    socket.on('connect', () => {
      console.log('✅ VLYNK Socket connected:', socket.id);
      updateConnectionState({
        status: 'connected',
        reconnectAttempts: 0,
        connectedAt: new Date(),
        lastError: undefined,
      });
    });

    // 연결 해제
    socket.on('disconnect', (reason) => {
      console.log('❌ VLYNK Socket disconnected:', reason);
      updateConnectionState({
        status: 'disconnected',
        connectedAt: undefined,
      });

      // 서버에서 강제로 끊은 경우가 아니라면 재연결 시도
      if (reason === 'io server disconnect') {
        // 서버에서 연결을 끊음 - 수동으로 재연결
        setTimeout(() => {
          if (socketRef.current && !socketRef.current.connected) {
            console.log('🔄 Attempting manual reconnection...');
            socketRef.current.connect();
          }
        }, 1000);
      }
    });

    // 재연결 시도
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}/${MAX_RECONNECT_ATTEMPTS}`);
      updateConnectionState({
        status: 'reconnecting',
        reconnectAttempts: attemptNumber,
      });
    });

    // 재연결 성공
    socket.on('reconnect', (attemptNumber) => {
      console.log(`🎯 Reconnected successfully after ${attemptNumber} attempts`);
      updateConnectionState({
        status: 'connected',
        reconnectAttempts: 0,
        connectedAt: new Date(),
        lastError: undefined,
      });
    });

    // 재연결 실패
    socket.on('reconnect_failed', () => {
      console.error('💥 Reconnection failed after maximum attempts');
      updateConnectionState({
        status: 'error',
        lastError: 'Maximum reconnection attempts reached',
      });
    });

    // 연결 에러
    socket.on('connect_error', (error) => {
      console.error('💥 Connection error:', error.message);
      updateConnectionState({
        status: 'error',
        lastError: error.message,
        reconnectAttempts: connectionState.reconnectAttempts + 1,
      });
    });

    // 일반적인 서버 에러
    socket.on('error', (errorData) => {
      console.error('💥 Server error:', errorData);
      updateConnectionState({
        lastError: typeof errorData === 'object' ? errorData.message : String(errorData),
      });
    });

    // 테스트 메시지 수신 (연결 확인용)
    socket.on('test message', (message) => {
      console.log('🧪 Test message received:', message);
    });

    setIsInitialized(true);
  }, [updateConnectionState, connectionState.reconnectAttempts]);

  // 소켓 연결 해제 함수
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting VLYNK socket...');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    updateConnectionState({
      status: 'disconnected',
      reconnectAttempts: 0,
      connectedAt: undefined,
    });
    setIsInitialized(false);
  }, [updateConnectionState]);

  // 이벤트 전송 함수
  const emit = useCallback(<T extends keyof VlynkClientToServerEvents>(
    event: T,
    data: Parameters<VlynkClientToServerEvents[T]>[0]
  ) => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.warn(`⚠️ Cannot emit '${event}': Socket not connected`);
      return false;
    }

    try {
      socketRef.current.emit(event as string, data);
      console.log(`📤 Emitted '${event}':`, data);
      return true;
    } catch (error) {
      console.error(`💥 Failed to emit '${event}':`, error);
      return false;
    }
  }, []);

  // 이벤트 리스너 등록 함수
  const on = useCallback(<T extends keyof VlynkServerToClientEvents>(
    event: T,
    handler: VlynkServerToClientEvents[T]
  ) => {
    if (!socketRef.current) {
      console.warn(`⚠️ Cannot register listener for '${event}': Socket not initialized`);
      return;
    }

    socketRef.current.on(event as string, handler as any);
    console.log(`👂 Registered listener for '${event}'`);
  }, []);

  // 이벤트 리스너 제거 함수
  const off = useCallback(<T extends keyof VlynkServerToClientEvents>(
    event: T,
    handler?: VlynkServerToClientEvents[T]
  ) => {
    if (!socketRef.current) return;

    if (handler) {
      socketRef.current.off(event as string, handler as any);
      console.log(`🚫 Removed specific listener for '${event}'`);
    } else {
      socketRef.current.off(event as string);
      console.log(`🚫 Removed all listeners for '${event}'`);
    }
  }, []);

  // 수동 재연결 함수
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      if (socketRef.current.connected) {
        console.log('🔄 Already connected, skipping reconnect');
        return;
      }
      
      console.log('🔄 Manual reconnection triggered');
      socketRef.current.connect();
    } else {
      console.log('🔄 Socket not initialized, creating new connection');
      connect();
    }
  }, [connect]);

  // Ping/Latency 측정
  const measureLatency = useCallback((): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !socketRef.current.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const start = performance.now();
      
      socketRef.current.emit('ping', start, (response: number) => {
        const latency = performance.now() - response;
        updateConnectionState({ latency });
        resolve(latency);
      });

      // 타임아웃 처리
      setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);
    });
  }, [updateConnectionState]);

  // 컴포넌트 마운트 시 연결
  useEffect(() => {
    if (!isInitialized) {
      connect();
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (socketRef.current) {
        console.log('🧹 Cleaning up VLYNK socket connection');
        disconnect();
      }
    };
  }, [connect, disconnect, isInitialized]);

  // 페이지 가시성 변경 시 처리 (배터리 최적화)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 페이지가 숨겨졌을 때 - 연결 유지하되 폴링 간격 조정
        if (socketRef.current) {
          socketRef.current.io.opts.transports = ['websocket'];
        }
      } else {
        // 페이지가 다시 보일 때 - 정상 모드로 복귀
        if (socketRef.current) {
          socketRef.current.io.opts.transports = ['websocket', 'polling'];
          if (!socketRef.current.connected) {
            socketRef.current.connect();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    // 소켓 인스턴스
    socket: socketRef.current,
    
    // 연결 상태
    connectionState,
    isConnected: connectionState.status === 'connected',
    isConnecting: connectionState.status === 'connecting',
    isReconnecting: connectionState.status === 'reconnecting',
    hasError: connectionState.status === 'error',
    isInitialized,
    
    // 연결 제어
    connect,
    disconnect,
    reconnect,
    
    // 이벤트 관리
    emit,
    on,
    off,
    
    // 유틸리티
    measureLatency,
  };
}

// 사용 예시를 위한 타입 가드들
export function isSocketConnected(socket: Socket | null): socket is Socket {
  return socket !== null && socket.connected;
}

export function canEmitEvent(socket: Socket | null): socket is Socket {
  return isSocketConnected(socket);
}