export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user' | 'guest';
  joinedAt: string;
}

// ===== 음악 룸 타입 =====
export interface MusicRoom {
  id: string;
  name: string;
  description: string;
  genres: string[];
  maxUsers: number;
  participants: number;
  musicCount: number;
  status: 'active' | 'development' | 'planning';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// ===== 오디오 파일 타입 =====
export interface AudioFile {
  id: string;
  name: string;
  url: string;
  blob?: Blob;
  duration: number;
  uploader: string;
  uploadedAt: string;
  size: number;
  type: string;
}

// ===== 채팅 메시지 타입 =====
export interface ChatMessage {
  id: string;
  roomId: string;
  user: string;
  message: string;
  timestamp: number; // 오디오 재생 시간
  time: string; // 실제 시간
  audioUrl?: string;
  type: 'text' | 'voice' | 'system';
}

// ===== 웨이브폼 데이터 타입 =====
export interface WaveformData {
  data: Float32Array;
  step: number;
  amp: number;
  width: number;
  height: number;
  isDummy?: boolean;
  dummyData?: number[];
}

// ===== 오디오 플레이어 상태 타입 =====
export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  error: string | null;
}

// ===== Socket.IO 이벤트 타입 =====
export interface ServerToClientEvents {
  // 룸 관련
  'music room list': (rooms: MusicRoom[]) => void;
  'music room created': (room: MusicRoom) => void;
  'music room updated': (room: MusicRoom) => void;
  'music room deleted': (roomId: string) => void;
  'music room join success': (data: { roomId: string; room: MusicRoom; users: User[] }) => void;
  'music room join error': (data: { message: string }) => void;
  'music room user joined': (user: User) => void;
  'music room user left': (userId: string) => void;
  
  // 채팅 관련
  'music chat message': (message: ChatMessage) => void;
  'music voice message': (message: ChatMessage) => void;
  
  // 오디오 관련
  'audio file uploaded': (file: AudioFile) => void;
  'audio file deleted': (fileId: string) => void;
  'audio playback sync': (data: { time: number; isPlaying: boolean }) => void;
}

export interface ClientToServerEvents {
  // 룸 관리
  'get music room list': () => void;
  'create music room': (data: Omit<MusicRoom, 'id' | 'createdAt' | 'updatedAt'>) => void;
  'join music room': (data: { roomId: string }) => void;
  'leave music room': (data: { roomId: string }) => void;
  
  // 채팅
  'music chat message': (message: Omit<ChatMessage, 'id'>) => void;
  'music voice message': (message: Omit<ChatMessage, 'id'>) => void;
  
  // 오디오
  'upload audio file': (data: { file: ArrayBuffer; fileName: string; roomId: string }) => void;
  'sync audio playback': (data: { roomId: string; time: number; isPlaying: boolean }) => void;
}

// ===== 컴포넌트 Props 타입들 =====

// LoginModal Props
export interface LoginModalProps {
  onLogin: (username: string) => void;
  isVisible: boolean;
}

// ProjectGrid Props
export interface ProjectGridProps {
  rooms: MusicRoom[];
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: (roomName: string) => void;
  onViewRoomInfo: (roomId: string) => void;
  currentUser: string;
  isLoading?: boolean;
}

// MusicRoom Props
export interface MusicRoomProps {
  room: MusicRoom | null;
  currentUser: string;
  onLeaveRoom: () => void;
  onSendMessage: (message: Omit<ChatMessage, 'id' | 'time'>) => void;
  onSendVoiceMessage: (audioBlob: Blob, timestamp: number) => void;
  isConnected: boolean;
}

// AudioControls Props
export interface AudioControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onUpload: (file: File) => void;
  onDownload: () => void;
  canDownload: boolean;
  isLoading?: boolean;
}

// WaveformVisualization Props
export interface WaveformVisualizationProps {
  audioFile: AudioFile | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  width?: number;
  height?: number;
  className?: string;
}

// ChatSection Props
export interface ChatSectionProps {
  messages: ChatMessage[];
  currentUser: string;
  currentTime: number;
  onSendMessage: (message: string) => void;
  onSendVoiceMessage: (audioBlob: Blob) => void;
  onSeekToTime: (time: number) => void;
  isConnected: boolean;
}

// VoiceRecorder Props
export interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  isDisabled?: boolean;
  maxDuration?: number; // 초 단위
}

// ===== 훅 반환 타입들 =====

// useProjectSocket 반환 타입
export interface UseProjectSocketReturn {
  socket: any; // Socket 타입은 실제 구현에서 정의
  isConnected: boolean;
  rooms: MusicRoom[];
  currentRoom: MusicRoom | null;
  connectedUsers: User[];
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  createRoom: (roomData: Omit<MusicRoom, 'id' | 'createdAt' | 'updatedAt'>) => void;
  sendMessage: (message: Omit<ChatMessage, 'id' | 'time'>) => void;
  sendVoiceMessage: (audioBlob: Blob, timestamp: number) => void;
  error: string | null;
}

// useAudioPlayer 반환 타입
export interface UseAudioPlayerReturn {
  // 상태
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  error: string | null;
  currentFile: AudioFile | null;
  
  // 메서드
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  loadFile: (file: File, uploader: string) => void;
  downloadFile: () => void;
  
  // 유틸리티
  formatTime: (seconds: number) => string;
  getProgressPercentage: () => number;
  
  // Ref
  audioRef: React.RefObject<HTMLAudioElement>;
}

// useWaveform 반환 타입
export interface UseWaveformReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  waveformData: WaveformData | null;
  isGenerating: boolean;
  error: string | null;
  generateWaveform: (file: File) => Promise<void>;
  updateProgress: (progressPercent: number) => void;
  handleCanvasClick: (event: React.MouseEvent<HTMLCanvasElement>) => number;
}

// useVoiceRecorder 반환 타입
export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isSupported: boolean;
  error: string | null;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
}

// ===== 유틸리티 타입들 =====

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 파일 업로드 상태
export interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

// 오디오 컨텍스트 설정
export interface AudioContextConfig {
  sampleRate?: number;
  bufferSize?: number;
  channels?: number;
}

// 웨이브폼 색상 설정
export interface WaveformColors {
  played: string;
  unplayed: string;
  background: string;
  playhead: string;
}

// 룸 생성 데이터
export interface CreateRoomData {
  name: string;
  description?: string;
  genres?: string[];
  maxUsers?: number;
  isPrivate?: boolean;
  password?: string;
}

// ===== Enum 타입들 =====
export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

export enum AudioFileStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  READY = 'ready',
  PLAYING = 'playing',
  PAUSED = 'paused',
  ERROR = 'error'
}

export enum ChatMessageType {
  TEXT = 'text',
  VOICE = 'voice',
  SYSTEM = 'system',
  FILE = 'file'
}

// ===== 상수 타입들 =====
export const AUDIO_FORMATS = [
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/m4a',
  'audio/aac'
] as const;

export type AudioFormat = typeof AUDIO_FORMATS[number];

export const USER_ROLES = ['admin', 'user', 'guest'] as const;
export type UserRole = typeof USER_ROLES[number];

export const ROOM_STATUS = ['active', 'development', 'planning'] as const;
export type RoomStatus = typeof ROOM_STATUS[number];

// ===== 타입 가드 함수들 =====
export function isValidAudioFormat(format: string): format is AudioFormat {
  return AUDIO_FORMATS.includes(format as AudioFormat);
}

export function isValidUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

export function isChatMessage(obj: any): obj is ChatMessage {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.roomId === 'string' &&
    typeof obj.user === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.timestamp === 'number' &&
    typeof obj.time === 'string'
  );
}

export function isAudioFile(obj: any): obj is AudioFile {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.url === 'string' &&
    typeof obj.duration === 'number' &&
    typeof obj.uploader === 'string'
  );
}