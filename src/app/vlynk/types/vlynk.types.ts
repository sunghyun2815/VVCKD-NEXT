export interface VlynkUser {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  avatar: UserAvatar;
  status: UserStatus;
  role: UserRole;
  profile: UserProfile;
  stats: UserStats;
  preferences: UserPreferences;
  createdAt: string;
  lastActiveAt: string;
  isOnline: boolean;
}

// ===== 사용자 아바타 =====
export interface UserAvatar {
  type: 'image' | 'generated' | 'emoji';
  url?: string; // 이미지 URL
  emoji?: string; // 이모지 아바타 (🎵, 🎸, 🎤 등)
  color: string; // 배경색 (#FF5500 등)
  style: 'retro' | 'pixel' | 'modern'; // 아바타 스타일
}

// ===== 사용자 상태 =====
export interface UserStatus {
  type: 'online' | 'away' | 'busy' | 'invisible' | 'offline';
  message?: string; // 상태 메시지 ("작업 중...", "비트 만드는 중 🎵")
  activity?: UserActivity; // 현재 활동
}

export interface UserActivity {
  type: 'listening' | 'creating' | 'chatting' | 'uploading' | 'idle';
  details?: string; // "Chill Beats Vol.1 듣는 중"
  roomId?: string; // 현재 참여 중인 룸
  startedAt: string;
}

// ===== 사용자 역할 =====
export type UserRole = 'admin' | 'moderator' | 'premium' | 'user' | 'guest';

export interface RolePermissions {
  canCreateRooms: boolean;
  canDeleteOthersFiles: boolean;
  canKickUsers: boolean;
  canManageRoomSettings: boolean;
  canModerateChat: boolean;
  maxUploadSize: number; // bytes
  maxRoomsCreated: number;
  canUseVoiceMessages: boolean;
  canSeeUserStats: boolean;
}

// ===== 사용자 프로필 =====
export interface UserProfile {
  bio?: string; // "로파이 비트 프로듀서 🎵"
  location?: string;
  website?: string;
  socialLinks: SocialLinks;
  musicStyle: string[]; // ["lo-fi", "electronic", "ambient"]
  instruments: string[]; // ["piano", "guitar", "vocals"]
  experience: UserExperience;
  badges: UserBadge[];
}

export interface SocialLinks {
  spotify?: string;
  soundcloud?: string;
  bandcamp?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
}

export type UserExperience = 'beginner' | 'intermediate' | 'advanced' | 'professional';

export interface UserBadge {
  id: string;
  name: string; // "첫 업로드", "채팅 마스터", "협업 전문가"
  description: string;
  icon: string; // 이모지 또는 아이콘
  color: string;
  earnedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// ===== 사용자 통계 =====
export interface UserStats {
  totalUploads: number;
  totalDownloads: number;
  totalListeningTime: number; // 분 단위
  totalChatMessages: number;
  totalVoiceMessages: number;
  roomsCreated: number;
  roomsJoined: number;
  collaborations: number; // 다른 사용자와의 협업 횟수
  favoriteGenres: GenreStats[];
  weeklyActivity: WeeklyActivity[];
  achievements: Achievement[];
}

export interface GenreStats {
  genre: string;
  count: number;
  percentage: number;
}

export interface WeeklyActivity {
  date: string; // YYYY-MM-DD
  uploads: number;
  listeningTime: number;
  messages: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
  progress?: {
    current: number;
    target: number;
  };
}

// ===== 사용자 설정 =====
export interface UserPreferences {
  theme: 'dark' | 'retro' | 'neon';
  language: 'ko' | 'en' | 'ja';
  notifications: NotificationSettings;
  audio: AudioSettings;
  privacy: PrivacySettings;
  display: DisplaySettings;
}

export interface NotificationSettings {
  newMessages: boolean;
  roomInvites: boolean;
  fileUploads: boolean;
  userJoinLeave: boolean;
  achievements: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
}

export interface AudioSettings {
  defaultVolume: number; // 0-100
  autoPlay: boolean;
  crossfade: boolean;
  highQuality: boolean; // 고음질 재생 여부
  enableEffects: boolean;
}

export interface PrivacySettings {
  showOnlineStatus: boolean;
  showActivity: boolean;
  showStats: boolean;
  allowDirectMessages: boolean;
  profileVisibility: 'public' | 'friends' | 'private';
}

export interface DisplaySettings {
  compactMode: boolean;
  showAvatars: boolean;
  showTimestamps: boolean;
  fontSize: 'small' | 'medium' | 'large';
  animationsEnabled: boolean;
}

// ===== 친구 시스템 =====
export interface UserFriend {
  id: string;
  user: VlynkUser;
  status: 'pending' | 'accepted' | 'blocked';
  addedAt: string;
  lastInteraction?: string;
}

export interface FriendRequest {
  id: string;
  from: VlynkUser;
  to: VlynkUser;
  message?: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'declined';
}

// ===== 사용자 세션 =====
export interface UserSession {
  id: string;
  userId: string;
  socketId: string;
  ip: string;
  userAgent: string;
  joinedAt: string;
  lastActiveAt: string;
  currentRoom?: string;
  currentActivity?: UserActivity;
}

// ===== 룸 권한 시스템 =====
export interface RoomPermission {
  userId: string;
  roomId: string;
  role: RoomRole;
  permissions: RoomPermissions;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
}

export type RoomRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest';

export interface RoomPermissions {
  canPlayMusic: boolean;
  canUploadFiles: boolean;
  canDeleteFiles: boolean;
  canInviteUsers: boolean;
  canKickUsers: boolean;
  canManageSettings: boolean;
  canModerateChat: boolean;
  canSeeUserList: boolean;
}

// ===== 개인 플레이리스트 =====
export interface UserPlaylist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  tracks: PlaylistTrack[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  coverImage?: string;
  tags: string[];
}

export interface PlaylistTrack {
  id: string;
  trackId: string;
  addedAt: string;
  addedBy: string;
  position: number;
  note?: string; // 개인 메모
}

// ===== 사용자 히스토리 =====
export interface UserHistory {
  recentlyPlayed: HistoryTrack[];
  recentlyVisitedRooms: HistoryRoom[];
  searchHistory: string[];
  downloadHistory: HistoryDownload[];
}

export interface HistoryTrack {
  trackId: string;
  trackName: string;
  roomId: string;
  roomName: string;
  playedAt: string;
  duration: number; // 들은 시간 (초)
}

export interface HistoryRoom {
  roomId: string;
  roomName: string;
  visitedAt: string;
  stayDuration: number; // 체류 시간 (분)
}

export interface HistoryDownload {
  trackId: string;
  trackName: string;
  downloadedAt: string;
  fileSize: number;
}

// ===== API 응답 타입들 =====
export interface UserResponse {
  success: boolean;
  data?: VlynkUser;
  error?: string;
}

export interface UserListResponse {
  success: boolean;
  data?: {
    users: VlynkUser[];
    total: number;
    page: number;
    limit: number;
  };
  error?: string;
}

export interface UserStatsResponse {
  success: boolean;
  data?: UserStats;
  error?: string;
}

// ===== 소켓 이벤트 타입 확장 =====
export interface UserSocketEvents {
  // 사용자 상태
  'user_status_changed': (data: { userId: string; status: UserStatus }) => void;
  'user_activity_changed': (data: { userId: string; activity: UserActivity }) => void;
  'user_profile_updated': (data: { userId: string; changes: Partial<UserProfile> }) => void;
  
  // 친구 시스템
  'friend_request_received': (request: FriendRequest) => void;
  'friend_request_accepted': (data: { userId: string; friend: VlynkUser }) => void;
  'friend_online': (friend: VlynkUser) => void;
  'friend_offline': (friendId: string) => void;
  
  // 알림
  'notification_received': (notification: UserNotification) => void;
  'achievement_unlocked': (achievement: Achievement) => void;
  'badge_earned': (badge: UserBadge) => void;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: 'friend_request' | 'room_invite' | 'mention' | 'achievement' | 'system';
  title: string;
  message: string;
  data?: any; // 추가 데이터
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
}

// ===== 유틸리티 타입들 =====
export type UserUpdate = Partial<Pick<VlynkUser, 'displayName' | 'avatar' | 'status' | 'profile' | 'preferences'>>;

export type CreateUserRequest = Pick<VlynkUser, 'username' | 'email' | 'displayName'> & {
  password: string;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  success: boolean;
  data?: {
    user: VlynkUser;
    token: string;
    expiresAt: string;
  };
  error?: string;
};