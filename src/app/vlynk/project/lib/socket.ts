import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/project.types';

// Socket.IO 클라이언트 타입
export type SocketIOClient = Socket<ServerToClientEvents, ClientToServerEvents>;

class SocketManager {
  private static instance: SocketManager;
  private socket: SocketIOClient | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  private constructor() {}

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  public connect(userId: string): SocketIOClient {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Socket.IO 연결 설정
    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      auth: {
        userId: userId,
        timestamp: Date.now()
      },
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 5000,
      forceNew: false
    });

    this.setupEventListeners();
    return this.socket;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // 연결 성공
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO Connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    // 연결 실패
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO Connection Error:', error);
      this.handleReconnect();
    });

    // 연결 끊김
    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket.IO Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // 서버가 연결을 끊은 경우 재연결 시도
        this.handleReconnect();
      }
    });

    // 재연결 시도
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO Reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
    });

    // 재연결 실패
    this.socket.on('reconnect_failed', () => {
      console.error('❌ Socket.IO Reconnection failed after maximum attempts');
    });

    // 핑/퐁으로 연결 상태 확인
    this.socket.on('ping', () => {
      console.log('🏓 Socket.IO Ping received');
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.socket?.connect();
      }, Math.pow(2, this.reconnectAttempts) * 1000); // 지수 백오프
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): SocketIOClient | null {
    return this.socket;
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketManager = SocketManager.getInstance();