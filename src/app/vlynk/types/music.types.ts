import type { VlynkUser, VlynkMessage, VlynkFileAttachment } from './vlynk.types';

// 음악 프로젝트 관련 타입들
export interface VlynkMusicProject {
  id: string;
  name: string;
  description: string;
  creator: string; // username
  collaborators: VlynkProjectCollaborator[];
  tracks: VlynkMusicTrack[];
  status: 'active' | 'completed' | 'archived' | 'development';
  genres: string[];
  bpm?: number;
  key?: string; // 음악 키 (C major, D minor 등)
  isPublic: boolean;
  maxCollaborators: number;
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
  projectImage?: string; // 프로젝트 썸네일
  tags: string[];
  metadata?: {
    daw?: string; // Digital Audio Workstation
    sampleRate?: number;
    bitDepth?: number;
    duration?: number; // 전체 길이 (초)
    mixdownUrl?: string; // 완성된 믹스다운 URL
    [key: string]: any;
  };
}

export interface VlynkProjectCollaborator {
  username: string;
  role: 'owner' | 'producer' | 'musician' | 'vocalist' | 'mixer' | 'listener';
  permissions: VlynkProjectPermission[];
  joinedAt: Date;
  lastActivity: Date;
  contributions: number; // 기여도 점수
  status: 'active' | 'inactive' | 'banned';
}

export interface VlynkProjectPermission {
  type: 'upload' | 'delete' | 'edit' | 'comment' | 'invite' | 'admin';
  granted: boolean;
  grantedBy: string; // username
  grantedAt: Date;
}

export interface VlynkMusicTrack {
  id: string;
  projectId: string;
  title: string;
  artist: string;
  filename: string; // 서버 파일명
  originalname: string; // 원본 파일명
  url: string; // 스트리밍 URL
  downloadUrl?: string; // 다운로드 URL
  duration: number; // 초 단위
  sampleRate: number; // 44100, 48000 등
  bitRate?: number; // kbps
  fileSize: number; // bytes
  format: string; // wav, mp3, flac 등
  waveform?: VlynkWaveformData; // 웨이브폼 데이터
  uploader: string; // username
  uploadedAt: string; // ISO string
  comments: VlynkTrackComment[];
  reactions: VlynkTrackReaction[];
  likes: string[]; // usernames who liked
  plays: number; // 재생 횟수
  isLocked: boolean; // 편집 잠금
  version: number; // 버전 번호
  parentTrackId?: string; // 이전 버전의 트랙 ID
  trackType: 'original' | 'remix' | 'cover' | 'sample' | 'loop';
  instruments: string[]; // 사용된 악기들
  tags: string[];
  bpm?: number;
  key?: string;
  metadata?: {
    stems?: VlynkTrackStem[]; // 개별 트랙들
    effects?: string[]; // 사용된 이펙트
    notes?: string; // 제작자 노트
    [key: string]: any;
  };
}

export interface VlynkTrackStem {
  id: string;
  name: string; // 'vocals', 'drums', 'bass' 등
  url: string;
  volume: number; // 0-100
  pan: number; // -50 ~ +50
  isMuted: boolean;
  isSolo: boolean;
  color?: string; // 시각적 구분용
}

export interface VlynkWaveformData {
  peaks: number[]; // 웨이브폼 피크 데이터
  length: number; // 총 길이
  bits: number; // 8, 16, 24, 32
  sample_rate: number;
  samples_per_pixel: number;
  data: number[][]; // [left_channel, right_channel]
}

export interface VlynkTrackComment {
  id: string;
  trackId: string;
  username: string;
  content: string;
  timestamp: number; // 트랙 내 위치 (초)
  createdAt: string; // ISO string
  editedAt?: string;
  isVoice: boolean;
  voiceUrl?: string;
  voiceDuration?: number;
  replies: VlynkTrackComment[];
  reactions: VlynkReaction[];
  mentions: string[]; // @mentions
  isDeleted: boolean;
  metadata?: {
    waveformRegion?: [number, number]; // [start, end] 영역 표시
    color?: string; // 댓글 색상
    [key: string]: any;
  };
}

export interface VlynkTrackReaction {
  id: string;
  emoji: string; // 🔥, 👍, ❤️, 🎵 등
  users: string[]; // usernames
  createdAt: string;
}

export interface VlynkReaction {
  id: string;
  type: 'emoji' | 'rating' | 'bookmark';
  value: string | number; // emoji string 또는 1-5 rating
  user: string; // username
  createdAt: string;
}

// 오디오 플레이어 상태
export interface VlynkAudioPlayerState {
  currentTrack: VlynkMusicTrack | null;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number; // 초
  duration: number; // 초
  volume: number; // 0-100
  isMuted: boolean;
  playbackRate: number; // 0.5 ~ 2.0
  repeat: 'none' | 'one' | 'all';
  shuffle: boolean;
  playlist: VlynkMusicTrack[];
  playlistIndex: number;
  error?: string;
}

// 웨이브폼 플레이어 상태
export interface VlynkWaveformState {
  isReady: boolean;
  isDrawing: boolean;
  zoom: number; // 1-100
  selection: [number, number] | null; // [start, end] in seconds
  regions: VlynkWaveformRegion[];
  visibleRange: [number, number]; // [start, end] visible area
  cursorPosition: number; // seconds
  followCursor: boolean; // 커서 따라가기
  pixelsPerSecond: number; // 줌 레벨
}

export interface VlynkWaveformRegion {
  id: string;
  start: number; // seconds
  end: number; // seconds
  color: string;
  label?: string;
  draggable: boolean;
  resizable: boolean;
  commentId?: string; // 연결된 댓글 ID
}

// 음악 룸 관련 타입들
export interface VlynkMusicRoom {
  id: string;
  projectId?: string; // 연결된 프로젝트 (선택적)
  name: string;
  description: string;
  creator: string;
  participants: VlynkMusicRoomParticipant[];
  maxParticipants: number;
  currentTrack: VlynkMusicTrack | null;
  playlist: VlynkMusicTrack[];
  playbackState: VlynkRoomPlaybackState;
  isPublic: boolean;
  hasPassword: boolean;
  genres: string[];
  tags: string[];
  createdAt: Date;
  lastActivity: Date;
  settings: VlynkMusicRoomSettings;
  messages: VlynkMessage[]; // 채팅 메시지들
}

export interface VlynkMusicRoomParticipant {
  username: string;
  role: 'host' | 'collaborator' | 'listener';
  permissions: VlynkRoomPermission[];
  joinedAt: Date;
  lastActivity: Date;
  isOnline: boolean;
  audioSettings?: {
    volume: number;
    isMuted: boolean;
  };
}

export interface VlynkRoomPermission {
  type: 'play' | 'pause' | 'skip' | 'queue' | 'upload' | 'delete' | 'kick';
  granted: boolean;
}

export interface VlynkRoomPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  startedAt?: Date; // 재생 시작 시간 (동기화용)
  startedBy?: string; // 재생을 시작한 사용자
}

export interface VlynkMusicRoomSettings {
  allowUploads: boolean;
  allowSkipping: boolean;
  requireApproval: boolean; // 업로드 승인 필요
  maxTrackLength: number; // 초 단위
  maxFileSize: number; // bytes
  allowedFormats: string[]; // ['mp3', 'wav', 'flac']
  autoPlay: boolean;
  crossfade: number; // 크로스페이드 길이 (초)
  volumeLimit: number; // 최대 볼륨 (0-100)
}

// API 응답 타입들
export interface VlynkMusicProjectResponse {
  success: boolean;
  data?: VlynkMusicProject[];
  error?: {
    code: string;
    message: string;
  };
}

export interface VlynkTrackUploadResponse {
  success: boolean;
  data?: VlynkMusicTrack;
  error?: string;
}

// 소켓 이벤트 (음악 관련 확장)
export interface VlynkMusicSocketEvents {
  // 프로젝트 관리
  'project:list': (projects: VlynkMusicProject[]) => void;
  'project:created': (project: VlynkMusicProject) => void;
  'project:updated': (project: VlynkMusicProject) => void;
  'project:deleted': (projectId: string) => void;
  'project:joined': (data: { projectId: string; user: string }) => void;
  'project:left': (data: { projectId: string; user: string }) => void;
  
  // 음악 룸 관리
  'music_room:list': (rooms: VlynkMusicRoom[]) => void;
  'music_room:created': (room: VlynkMusicRoom) => void;
  'music_room:joined': (data: { roomId: string; user: string; userCount: number }) => void;
  'music_room:left': (data: { roomId: string; user: string; userCount: number }) => void;
  
  // 트랙 관리
  'track:uploaded': (track: VlynkMusicTrack) => void;
  'track:deleted': (trackId: string) => void;
  'track:updated': (track: VlynkMusicTrack) => void;
  
  // 재생 동기화
  'playback:play': (data: { trackId: string; position: number; startTime: Date }) => void;
  'playback:pause': (data: { position: number }) => void;
  'playback:seek': (data: { position: number }) => void;
  'playback:next': (data: { trackId: string }) => void;
  'playback:previous': (data: { trackId: string }) => void;
  
  // 실시간 댓글
  'comment:added': (comment: VlynkTrackComment) => void;
  'comment:deleted': (commentId: string) => void;
  'comment:updated': (comment: VlynkTrackComment) => void;
  
  // 실시간 반응
  'reaction:added': (data: { targetId: string; reaction: VlynkReaction }) => void;
  'reaction:removed': (data: { targetId: string; reactionId: string }) => void;
}

// 에러 코드 (음악 관련 확장)
export enum VlynkMusicErrorCode {
  // 프로젝트 오류
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  PROJECT_ACCESS_DENIED = 'PROJECT_ACCESS_DENIED',
  PROJECT_FULL = 'PROJECT_FULL',
  
  // 트랙 오류
  TRACK_NOT_FOUND = 'TRACK_NOT_FOUND',
  TRACK_LOCKED = 'TRACK_LOCKED',
  UNSUPPORTED_AUDIO_FORMAT = 'UNSUPPORTED_AUDIO_FORMAT',
  AUDIO_TOO_LONG = 'AUDIO_TOO_LONG',
  WAVEFORM_GENERATION_FAILED = 'WAVEFORM_GENERATION_FAILED',
  
  // 재생 오류
  PLAYBACK_ERROR = 'PLAYBACK_ERROR',
  AUDIO_DECODE_ERROR = 'AUDIO_DECODE_ERROR',
  SYNC_ERROR = 'SYNC_ERROR',
  
  // 댓글/반응 오류
  COMMENT_AT_INVALID_TIME = 'COMMENT_AT_INVALID_TIME',
  VOICE_RECORDING_FAILED = 'VOICE_RECORDING_FAILED',
  REACTION_LIMIT_EXCEEDED = 'REACTION_LIMIT_EXCEEDED',
}

// 상수들 (음악 관련)
export const VLYNK_MUSIC_CONSTANTS = {
  // 오디오 설정
  MAX_TRACK_DURATION: 600, // 10분
  MIN_TRACK_DURATION: 1, // 1초
  SUPPORTED_AUDIO_FORMATS: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'],
  SUPPORTED_SAMPLE_RATES: [22050, 44100, 48000, 96000],
  
  // 웨이브폼 설정
  WAVEFORM_SAMPLES_PER_PIXEL: 512,
  MAX_WAVEFORM_WIDTH: 4000,
  MIN_PIXELS_PER_SECOND: 10,
  MAX_PIXELS_PER_SECOND: 1000,
  
  // 댓글 설정
  MAX_COMMENTS_PER_TRACK: 100,
  MAX_VOICE_COMMENT_DURATION: 30, // 30초
  COMMENT_TIMESTAMP_PRECISION: 0.1, // 0.1초 단위
  
  // 룸 설정
  MAX_ROOM_PARTICIPANTS: 50,
  DEFAULT_CROSSFADE_DURATION: 3, // 3초
  SYNC_TOLERANCE: 0.5, // 동기화 허용 오차 (초)
  
  // UI 설정
  PLAYBACK_UPDATE_INTERVAL: 100, // ms
  WAVEFORM_DRAW_THROTTLE: 50, // ms
  AUTO_SAVE_INTERVAL: 5000, // 5초
  
  // 파일 크기
  MAX_AUDIO_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_VOICE_MESSAGE_SIZE: 5 * 1024 * 1024, // 5MB
} as const;

// React 컴포넌트 Props 타입들 (음악 관련)
export interface VlynkMusicProjectGridProps {
  projects: VlynkMusicProject[];
  onProjectSelect: (project: VlynkMusicProject) => void;
  onProjectCreate?: () => void;
  currentUser: VlynkUser;
  loading?: boolean;
}

export interface VlynkWaveformPlayerProps {
  track: VlynkMusicTrack;
  isPlaying: boolean;
  currentTime: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onTimeUpdate?: (time: number) => void;
  comments?: VlynkTrackComment[];
  onCommentAdd?: (comment: Omit<VlynkTrackComment, 'id' | 'createdAt'>) => void;
  waveformState?: VlynkWaveformState;
  onWaveformStateChange?: (state: Partial<VlynkWaveformState>) => void;
  className?: string;
}

export interface VlynkAudioControlsProps {
  playerState: VlynkAudioPlayerState;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onMute: () => void;
  onRepeatChange: (repeat: VlynkAudioPlayerState['repeat']) => void;
  onShuffleToggle: () => void;
  disabled?: boolean;
}

export interface VlynkTrackCommentsProps {
  track: VlynkMusicTrack;
  comments: VlynkTrackComment[];
  currentUser: VlynkUser;
  currentTime: number;
  onCommentAdd: (comment: Omit<VlynkTrackComment, 'id' | 'createdAt'>) => void;
  onCommentDelete: (commentId: string) => void;
  onCommentEdit: (commentId: string, newContent: string) => void;
  onSeekToComment: (timestamp: number) => void;
}

// 유틸리티 타입들
export type VlynkAudioFormat = typeof VLYNK_MUSIC_CONSTANTS.SUPPORTED_AUDIO_FORMATS[number];
export type VlynkSampleRate = typeof VLYNK_MUSIC_CONSTANTS.SUPPORTED_SAMPLE_RATES[number];

// 타입 가드들
export function isValidAudioFormat(format: string): format is VlynkAudioFormat {
  return VLYNK_MUSIC_CONSTANTS.SUPPORTED_AUDIO_FORMATS.includes(format as VlynkAudioFormat);
}

export function isValidSampleRate(rate: number): rate is VlynkSampleRate {
  return VLYNK_MUSIC_CONSTANTS.SUPPORTED_SAMPLE_RATES.includes(rate as VlynkSampleRate);
}

export function isTrackOwner(track: VlynkMusicTrack, username: string): boolean {
  return track.uploader === username;
}

export function canEditProject(project: VlynkMusicProject, username: string): boolean {
  if (project.creator === username) return true;
  
  const collaborator = project.collaborators.find(c => c.username === username);
  return collaborator?.permissions.some(p => p.type === 'edit' && p.granted) || false;
}