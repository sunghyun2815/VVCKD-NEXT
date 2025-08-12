export interface VlynkUser {
  id: string;
  username: string;
  role: 'admin' | 'member' | 'guest';
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  joinedAt: Date;
  lastActivity: Date;
  metadata?: Record<string, unknown>;
}

export interface VlynkRoom {
  id: string;
  name: string;
  description?: string;
  creator: string; // username
  participants: string[]; // usernames
  maxUsers: number;
  hasPassword: boolean;
  isPrivate: boolean;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  tags: string[];
  type: 'text' | 'music' | 'project';
  metadata?: Record<string, unknown>;
}

export interface VlynkMessage {
  id: string;
  roomId: string;
  username: string; // sender username
  content: string;
  type: 'text' | 'file' | 'voice' | 'system';
  timestamp: string; // ISO string
  editedAt?: string;
  isDeleted: boolean;
  isPrevious?: boolean; // 기존 메시지인지 (서버에서 전송)
  fileData?: VlynkFileAttachment;
  voiceData?: VlynkVoiceAttachment;
  mentions: string[];
  reactions: VlynkReaction[];
  metadata?: Record<string, unknown>;
}

export interface VlynkFileAttachment {
  id: string;
  filename: string; // 서버에 저장된 파일명
  originalname: string; // 원본 파일명
  mimeType: string;
  size: number;
  url: string; // 접근 URL
  thumbnailUrl?: string;
  downloadDisabled: boolean;
  uploadedBy: string; // username
  uploadedAt: string; // ISO string
  metadata?: Record<string, unknown>;
}

export interface VlynkVoiceAttachment {
  id: string;
  duration: number; // 초 단위
  waveform?: number[]; // 웨이브폼 데이터
  url: string;
  transcription?: string; // 음성 → 텍스트 변환
  uploadedBy: string; // username
  uploadedAt: string; // ISO string
  metadata?: Record<string, unknown>;
}

export interface VlynkReaction {
  id: string;
  emoji: string;
  users: string[]; // usernames
  count: number;
  createdAt: string; // ISO string
}

// 음악 프로젝트 관련 타입들
export interface VlynkMusicProject {
  id: string;
  name: string;
  description: string;
  creator: string; // username
  collaborators: string[]; // usernames
  tracks: VlynkMusicTrack[];
  status: 'active' | 'completed' | 'archived';
  genres: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface VlynkMusicTrack {
  id: string;
  projectId: string;
  title: string;
  artist: string;
  filename: string;
  originalname: string;
  url: string;
  duration: number; // 초 단위
  waveform?: number[];
  uploader: string; // username
  uploadedAt: string; // ISO string
  comments: VlynkTrackComment[];
  likes: string[]; // usernames who liked
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface VlynkTrackComment {
  id: string;
  trackId: string;
  username: string;
  content: string;
  timestamp: number; // 트랙 내 위치 (초)
  createdAt: string; // ISO string
  isVoice: boolean;
  voiceUrl?: string;
  replies: VlynkTrackComment[];
}

// 연결 상태 관련
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface VlynkConnectionState {
  status: ConnectionStatus;
  reconnectAttempts: number;
  lastError?: string;
  connectedAt?: Date;
  latency?: number;
}

// API 응답 타입들
export interface VlynkApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface VlynkRoomListResponse {
  rooms: Array<{
    name: string;
    userCount: number;
    maxUsers?: number;
    lastMessage?: string;
    lastMessageTime?: string;
    hasPassword: boolean;
    creator: string;
  }>;
}

// 소켓 이벤트 타입 매핑
export interface VlynkServerToClientEvents {
  // 연결 관련
  'connect': () => void;
  'disconnect': (reason: string) => void;
  'reconnect': () => void;
  'connect_error': (error: Error) => void;
  
  // 방 관련
  'room list': (data: VlynkRoomListResponse['rooms']) => void;
  'room created': (data: { roomName: string; maxUsers?: number; hasPassword: boolean }) => void;
  'room join success': (data: { roomName: string; userCount: number; maxUsers?: number }) => void;
  'room join error': (data: { message: string }) => void;
  'room user count': (data: { count: number; maxUsers?: number }) => void;
  'user joined room': (data: { username: string; userCount: number }) => void;
  'user left room': (data: { username: string; userCount: number }) => void;
  
  // 메시지 관련
  'chat message': (message: VlynkMessage) => void;
  'message deleted': (data: { messageId: string }) => void;
  'delete success': (data: { messageId: string }) => void;
  'delete error': (data: { message: string }) => void;
  
  // 음악 프로젝트 관련
  'music room list': (rooms: VlynkMusicProject[]) => void;
  'music room created': (room: VlynkMusicProject) => void;
  'music room join success': (data: { roomId: string; roomName: string; userCount: number }) => void;
  'music room join error': (data: { message: string }) => void;
  'music chat message': (message: VlynkMessage) => void;
  
  // 타이핑 인디케이터
  'user typing': (data: { username: string; roomName: string }) => void;
  'user stopped typing': (data: { username: string; roomName: string }) => void;
  
  // 시스템
  'test message': (message: string) => void;
  'error': (data: { message: string; code?: string }) => void;
}

export interface VlynkClientToServerEvents {
  // 인증
  'user join': (data: { username: string; role?: string }) => void;
  
  // 방 관리
  'get room list': () => void;
  'create room': (data: { roomName: string; maxUsers?: number; password?: string }) => void;
  'join room': (data: { roomName: string; password?: string }) => void;
  'leave room': (data: { roomName: string }) => void;
  
  // 메시지
  'chat message': (data: { roomName: string; message: string; fileData?: any }) => void;
  'delete message': (data: { roomName: string; messageId: string }) => void;
  
  // 음악 프로젝트
  'get music room list': () => void;
  'create music room': (data: { roomName: string; description?: string; maxUsers?: number; genres?: string[] }) => void;
  'join music room': (data: { roomId: string }) => void;
  'leave music room': (data: { roomId: string }) => void;
  'music chat message': (data: { roomId: string; message: string; user?: string; timestamp?: number }) => void;
  'music voice message': (data: { roomId: string; user?: string; timestamp?: number; audioUrl: string }) => void;
  
  // 타이핑
  'typing start': (data: { roomName: string; username: string }) => void;
  'typing stop': (data: { roomName: string; username: string }) => void;
}

// 유틸리티 타입들
export type VlynkEventName = keyof VlynkServerToClientEvents;
export type VlynkEmitEventName = keyof VlynkClientToServerEvents;

// 상수들
export const VLYNK_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_VOICE_DURATION: 300, // 5분
  TYPING_TIMEOUT: 3000, // 3초
  RECONNECT_ATTEMPTS: 5,
  SOCKET_TIMEOUT: 20000,
  
  // 지원 파일 형식
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  SUPPORTED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm'],
  
  // 방 설정
  DEFAULT_MAX_USERS: 20,
  MAX_ROOM_NAME_LENGTH: 50,
  MAX_ROOM_DESCRIPTION_LENGTH: 200,
  
  // UI 설정
  MESSAGES_PER_PAGE: 50,
  SCROLL_THRESHOLD: 100,
} as const;

// 에러 코드 열거형
export enum VlynkErrorCode {
  // 연결 오류
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // 방 오류
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // 메시지 오류
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  CANNOT_DELETE_MESSAGE = 'CANNOT_DELETE_MESSAGE',
  
  // 파일 오류
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  
  // 일반 오류
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
}

// React 컴포넌트 Props 타입들
export interface VlynkBaseProps {
  className?: string;
  'data-testid'?: string;
}

export interface VlynkRoomGridProps extends VlynkBaseProps {
  rooms: VlynkRoom[];
  onRoomSelect: (room: VlynkRoom) => void;
  onRoomCreate?: () => void;
  loading?: boolean;
}

export interface VlynkChatRoomProps extends VlynkBaseProps {
  room: VlynkRoom;
  messages: VlynkMessage[];
  currentUser: VlynkUser;
  onSendMessage: (content: string, type?: VlynkMessage['type']) => void;
  onDeleteMessage: (messageId: string) => void;
  onLeaveRoom: () => void;
  typingUsers: string[];
}

export interface VlynkFileUploaderProps extends VlynkBaseProps {
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  onFileSelect: (file: File) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (result: VlynkFileAttachment) => void;
  onUploadError?: (error: Error) => void;
}