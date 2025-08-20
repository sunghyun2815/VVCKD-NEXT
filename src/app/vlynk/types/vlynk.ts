export interface VlynkUser {
  id: string;
  username: string;
  role: 'guest' | 'user' | 'admin';
  joinedAt: string;
  currentRoom?: string;
}

export interface ChatRoom {
  name: string;
  userCount: number;
  maxUsers?: number;
  hasPassword: boolean;
  creator: string;
  lastMessage?: string;
  lastMessageTime: number;
  description?: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: number;
  roomName: string;
  fileData?: {
    name: string;
    url: string;
    type: string;
    size: number;
  };
}

export interface MusicRoom {
  id: string;
  name: string;
  description: string;
  participants: number;
  maxUsers: number;
  musicCount: number;
  status: 'active' | 'paused' | 'completed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface AudioFile {
  id: string;
  name: string;
  filename: string;
  url: string;
  size: number;
  duration?: number;
  uploader: string;
  uploadedAt: string;
  roomId: string;
  waveform?: number[];
}

export interface MusicComment {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  audioTimestamp?: number;
  time: string;
  roomId: string;
  audioUrl?: string;
  type: 'text' | 'voice';
}

export interface SocketEvents {
  // User events
  user_join: (data: { username: string }) => void;
  user_join_success: (user: VlynkUser) => void;
  user_join_error: (data: { message: string }) => void;
  user_leave: () => void;

  // Chat room events
  get_room_list: () => void;
  room_list: (rooms: ChatRoom[]) => void;
  create_room: (data: { roomName: string; maxUsers?: number; password?: string }) => void;
  room_created: (data: { roomName: string; hasPassword: boolean; maxUsers?: number }) => void;
  join_room: (data: { roomName: string; password?: string }) => void;
  room_join_success: (data: { roomName: string; userCount: number; maxUsers?: number }) => void;
  room_join_error: (data: { message: string }) => void;
  leave_room: (data: { roomName: string }) => void;
  chat_message: (message: ChatMessage) => void;
  user_joined_room: (data: { username: string; userCount: number }) => void;
  user_left_room: (data: { username: string; userCount: number }) => void;

  // Music room events
  get_music_room_list: () => void;
  music_room_list: (rooms: MusicRoom[]) => void;
  create_music_room: (data: Partial<MusicRoom>) => void;
  music_room_created: (room: MusicRoom) => void;
  join_music_room: (data: { roomId: string }) => void;
  music_room_join_success: (data: { roomId: string; room: MusicRoom; users: VlynkUser[] }) => void;
  music_room_join_error: (data: { message: string }) => void;
  leave_music_room: (data: { roomId: string }) => void;
  music_room_updated: (room: MusicRoom) => void;
  
  // Audio events
  upload_audio_file: (data: { file: ArrayBuffer; fileName: string; roomId: string }) => void;
  audio_file_uploaded: (file: AudioFile) => void;
  sync_audio_playback: (data: { roomId: string; time: number; isPlaying: boolean }) => void;
  audio_playback_sync: (data: { time: number; isPlaying: boolean }) => void;
  
  // Comment events
  music_chat_message: (comment: MusicComment) => void;
  music_voice_message: (voiceMessage: MusicComment) => void;
}