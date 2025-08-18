// src/app/vlynk/project/components/MusicRoomView.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import WaveformVisualizer from './WaveformVisualizer';
import AudioPlayer from './AudioPlayer';
import ChatSystem from './ChatSystem';
import FileUploader from './FileUploader';
import type { 
  MusicRoom, 
  AudioFile, 
  ChatMessage, 
  User,
  AudioPlayerState,
  WaveformData 
} from '../types/project.types';
import styles from '../musicroom.module.css';

interface MusicRoomViewProps {
  room: MusicRoom;
  currentUser: string;
  connectedUsers: User[];
  onLeaveRoom: () => void;
  socket?: any; // Socket.IO 인스턴스
}

export default function MusicRoomView({
  room,
  currentUser,
  connectedUsers,
  onLeaveRoom,
  socket
}: MusicRoomViewProps) {
  // ===== 상태 관리 =====
  const [currentTrack, setCurrentTrack] = useState<AudioFile | null>(null);
  const [playlist, setPlaylist] = useState<AudioFile[]>([]);
  const [audioPlayerState, setAudioPlayerState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isLoading: false,
    error: null
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  // ===== Refs =====
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);

  // ===== 더미 데이터 (개발용) =====
  const dummyTracks: AudioFile[] = [
    {
      id: 'track-1',
      name: 'Chill Beats Vol.1.mp3',
      url: '/uploads/music/chill-beats-1.mp3',
      duration: 245,
      uploader: 'producer_alex',
      uploadedAt: '2024-01-15T10:30:00Z',
      size: 5242880,
      type: 'audio/mp3'
    },
    {
      id: 'track-2', 
      name: 'Study Session Loop.wav',
      url: '/uploads/music/study-loop.wav',
      duration: 180,
      uploader: 'beat_master',
      uploadedAt: '2024-01-15T09:15:00Z',
      size: 12582912,
      type: 'audio/wav'
    }
  ];

  // ===== 오디오 제어 함수들 =====
  const handlePlay = useCallback(() => {
    if (!currentTrack || !audioRef.current) return;
    
    audioRef.current.play()
      .then(() => {
        setAudioPlayerState(prev => ({ ...prev, isPlaying: true, error: null }));
        
        // Socket.IO로 재생 상태 동기화
        if (socket) {
          socket.emit('sync audio playback', {
            roomId: room.id,
            time: audioRef.current?.currentTime || 0,
            isPlaying: true
          });
        }
      })
      .catch(err => {
        console.error('❌ Audio play failed:', err);
        setAudioPlayerState(prev => ({ 
          ...prev, 
          error: 'Failed to play audio' 
        }));
      });
  }, [currentTrack, socket, room.id]);

  const handlePause = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setAudioPlayerState(prev => ({ ...prev, isPlaying: false }));
    
    // Socket.IO로 일시정지 상태 동기화
    if (socket) {
      socket.emit('sync audio playback', {
        roomId: room.id,
        time: audioRef.current.currentTime,
        isPlaying: false
      });
    }
  }, [socket, room.id]);

  const handleSeek = useCallback((time: number) => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = time;
    setAudioPlayerState(prev => ({ ...prev, currentTime: time }));
    
    // Socket.IO로 탐색 위치 동기화
    if (socket) {
      socket.emit('sync audio playback', {
        roomId: room.id,
        time: time,
        isPlaying: audioPlayerState.isPlaying
      });
    }
  }, [socket, room.id, audioPlayerState.isPlaying]);

  const handleVolumeChange = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    setAudioPlayerState(prev => ({ ...prev, volume }));
  }, []);

  // ===== 트랙 관리 함수들 =====
  const handleTrackSelect = useCallback((track: AudioFile) => {
    console.log('🎵 Selecting track:', track.name);
    
    setAudioPlayerState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }));
    
    setCurrentTrack(track);
    
    // 웨이브폼 데이터 로드 시뮬레이션
    setTimeout(() => {
      const dummyWaveform: WaveformData = {
        data: new Float32Array(Array.from({ length: 1000 }, () => Math.random() * 2 - 1)),
        step: 1,
        amp: 1,
        width: 1000,
        height: 100,
        isDummy: true
      };
      setWaveformData(dummyWaveform);
      setAudioPlayerState(prev => ({ ...prev, isLoading: false }));
    }, 1000);
  }, []);

  const handleNextTrack = useCallback(() => {
    if (playlist.length === 0) return;
    
    const currentIndex = playlist.findIndex(t => t.id === currentTrack?.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    handleTrackSelect(playlist[nextIndex]);
  }, [playlist, currentTrack, handleTrackSelect]);

  const handlePreviousTrack = useCallback(() => {
    if (playlist.length === 0) return;
    
    const currentIndex = playlist.findIndex(t => t.id === currentTrack?.id);
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    handleTrackSelect(playlist[prevIndex]);
  }, [playlist, currentTrack, handleTrackSelect]);

  // ===== 채팅 함수들 =====
  const handleSendMessage = useCallback((message: string, timestamp?: number) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      roomId: room.id,
      user: currentUser,
      message: message,
      timestamp: timestamp || audioPlayerState.currentTime,
      time: new Date().toISOString(),
      type: 'text'
    };

    setChatMessages(prev => [...prev, newMessage]);
    
    // Socket.IO로 메시지 전송
    if (socket) {
      socket.emit('music chat message', newMessage);
    }
  }, [room.id, currentUser, audioPlayerState.currentTime, socket]);

  const handleVoiceMessage = useCallback(async (audioBlob: Blob) => {
    console.log('🎤 Recording voice message:', audioBlob);
    
    // TODO: 음성 메시지 업로드 구현
    const voiceMessage: ChatMessage = {
      id: `voice-${Date.now()}`,
      roomId: room.id,
      user: currentUser,
      message: '[Voice Message]',
      timestamp: audioPlayerState.currentTime,
      time: new Date().toISOString(),
      type: 'voice',
      audioUrl: URL.createObjectURL(audioBlob)
    };

    setChatMessages(prev => [...prev, voiceMessage]);
    
    if (socket) {
      socket.emit('music voice message', voiceMessage);
    }
  }, [room.id, currentUser, audioPlayerState.currentTime, socket]);

  // ===== 파일 업로드 함수들 =====
  const handleFileUpload = useCallback(async (file: File) => {
    console.log('📁 Uploading file:', file.name);
    
    setShowUploader(false);
    
    // TODO: 실제 파일 업로드 구현
    const newTrack: AudioFile = {
      id: `track-${Date.now()}`,
      name: file.name,
      url: URL.createObjectURL(file),
      blob: file,
      duration: 0, // 실제로는 오디오 분석 필요
      uploader: currentUser,
      uploadedAt: new Date().toISOString(),
      size: file.size,
      type: file.type
    };

    setPlaylist(prev => [...prev, newTrack]);
    
    if (socket) {
      socket.emit('upload audio file', {
        file: await file.arrayBuffer(),
        fileName: file.name,
        roomId: room.id
      });
    }
  }, [currentUser, room.id, socket]);

  // ===== 효과 =====
  
  // 컴포넌트 마운트 시 더미 데이터 로드
  useEffect(() => {
    setPlaylist(dummyTracks);
    if (dummyTracks.length > 0) {
      handleTrackSelect(dummyTracks[0]);
    }
  }, [handleTrackSelect]);

  // 오디오 이벤트 리스너
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setAudioPlayerState(prev => ({
        ...prev,
        currentTime: audio.currentTime
      }));
    };

    const handleLoadedMetadata = () => {
      setAudioPlayerState(prev => ({
        ...prev,
        duration: audio.duration
      }));
    };

    const handleEnded = () => {
      setAudioPlayerState(prev => ({ ...prev, isPlaying: false }));
      handleNextTrack();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [handleNextTrack]);

  // Socket.IO 이벤트 리스너
  useEffect(() => {
    if (!socket) return;

    const handleAudioSync = ({ time, isPlaying }: { time: number; isPlaying: boolean }) => {
      if (!audioRef.current) return;
      
      audioRef.current.currentTime = time;
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
      
      setAudioPlayerState(prev => ({
        ...prev,
        currentTime: time,
        isPlaying
      }));
    };

    const handleChatMessage = (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
    };

    socket.on('audio playback sync', handleAudioSync);
    socket.on('music chat message', handleChatMessage);
    socket.on('music voice message', handleChatMessage);

    return () => {
      socket.off('audio playback sync', handleAudioSync);
      socket.off('music chat message', handleChatMessage);
      socket.off('music voice message', handleChatMessage);
    };
  }, [socket]);

  // ===== 렌더링 =====
  return (
    <div className={styles.musicRoomContainer}>
      {/* 숨겨진 오디오 엘리먼트 */}
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        preload="metadata"
        style={{ display: 'none' }}
      />

      {/* 상단 헤더 */}
      <div className={styles.roomHeader}>
        <div className={styles.roomInfo}>
          <h1 className={styles.roomTitle}>{room.name}</h1>
          <div className={styles.roomMeta}>
            <span className={styles.userCount}>
              👥 {connectedUsers.length}/{room.maxUsers}
            </span>
            <span className={styles.trackCount}>
              🎵 {playlist.length} tracks
            </span>
          </div>
        </div>
        
        <div className={styles.roomControls}>
          <button
            onClick={() => setShowUploader(true)}
            className={styles.uploadBtn}
          >
            📁 UPLOAD
          </button>
          <button
            onClick={onLeaveRoom}
            className={styles.leaveBtn}
          >
            ← LEAVE
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className={styles.mainContent}>
        {/* 왼쪽: 오디오 플레이어 & 웨이브폼 */}
        <div className={styles.audioSection}>
          <AudioPlayer
            track={currentTrack}
            playerState={audioPlayerState}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onNext={handleNextTrack}
            onPrevious={handlePreviousTrack}
          />
          
          <WaveformVisualizer
            waveformData={waveformData}
            currentTime={audioPlayerState.currentTime}
            duration={audioPlayerState.duration}
            onSeek={handleSeek}
            comments={chatMessages}
            isLoading={audioPlayerState.isLoading}
          />
        </div>

        {/* 오른쪽: 채팅 & 플레이리스트 */}
        <div className={styles.sidePanel}>
          <ChatSystem
            messages={chatMessages}
            currentUser={currentUser}
            connectedUsers={connectedUsers}
            currentTime={audioPlayerState.currentTime}
            onSendMessage={handleSendMessage}
            onVoiceMessage={handleVoiceMessage}
            isRecording={isRecording}
            onRecordingChange={setIsRecording}
          />

          {/* 플레이리스트 */}
          <div className={styles.playlistSection}>
            <div className={styles.sectionHeader}>
              <h3>PLAYLIST</h3>
              <span className={styles.trackCount}>{playlist.length}</span>
            </div>
            
            <div className={styles.playlistTracks}>
              {playlist.map(track => (
                <div
                  key={track.id}
                  className={`${styles.trackItem} ${
                    currentTrack?.id === track.id ? styles.active : ''
                  }`}
                  onClick={() => handleTrackSelect(track)}
                >
                  <div className={styles.trackInfo}>
                    <div className={styles.trackName}>{track.name}</div>
                    <div className={styles.trackMeta}>
                      by {track.uploader} • {Math.floor(track.duration / 60)}:
                      {String(track.duration % 60).padStart(2, '0')}
                    </div>
                  </div>
                  
                  {currentTrack?.id === track.id && (
                    <div className={styles.nowPlayingIndicator}>
                      <div className={styles.audioWave}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 파일 업로더 모달 */}
      {showUploader && (
        <FileUploader
          onFileUpload={handleFileUpload}
          onClose={() => setShowUploader(false)}
          acceptedFormats={['.mp3', '.wav', '.m4a', '.ogg']}
          maxFileSize={50 * 1024 * 1024} // 50MB
        />
      )}

      {/* 연결된 사용자 목록 */}
      <div className={styles.connectedUsers}>
        <div className={styles.usersHeader}>CONNECTED USERS</div>
        <div className={styles.usersList}>
          {connectedUsers.map(user => (
            <div key={user.id} className={styles.userItem}>
              <span className={styles.userRole}>{user.role}</span>
              <span className={styles.userName}>{user.username}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}