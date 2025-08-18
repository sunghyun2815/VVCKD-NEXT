'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { 
  MusicRoom, 
  AudioFile, 
  ChatMessage, 
  User,
  AudioPlayerState,
  WaveformData 
} from '../types/project.types';
import styles from './MusicRoomView.module.css';

// ===== Props 타입 =====
interface MusicRoomViewProps {
  room: MusicRoom;
  currentUser: string;
  connectedUsers: User[];
  onLeaveRoom: () => void;
  socket?: any; // Socket.IO 인스턴스
}

// ===== 메인 컴포넌트 =====
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
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [showChat, setShowChat] = useState(true);

  // ===== Refs =====
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ===== 더미 데이터 (개발용) =====
  const dummyTracks: AudioFile[] = [
    {
      id: 'track-1',
      name: 'Chill Beats Vol.1.mp3',
      url: '/dummy-audio-1.mp3',
      blob: new Blob(),
      duration: 245,
      uploader: 'producer_alex',
      uploadedAt: '2024-01-15T10:30:00Z',
      size: 5242880,
      type: 'audio/mp3'
    },
    {
      id: 'track-2', 
      name: 'Study Session Loop.wav',
      url: '/dummy-audio-2.wav',
      blob: new Blob(),
      duration: 180,
      uploader: 'beat_master',
      uploadedAt: '2024-01-15T09:15:00Z',
      size: 12582912,
      type: 'audio/wav'
    },
    {
      id: 'track-3',
      name: 'Ambient Drone.mp3',
      url: '/dummy-audio-3.mp3',
      blob: new Blob(),
      duration: 320,
      uploader: currentUser,
      uploadedAt: '2024-01-15T11:45:00Z',
      size: 8388608,
      type: 'audio/mp3'
    }
  ];

  // ===== 오디오 제어 함수들 =====
  const handlePlay = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;
    
    audioRef.current.play().then(() => {
      setAudioPlayerState(prev => ({ ...prev, isPlaying: true, error: null }));
      
      // Socket.IO로 재생 상태 동기화
      if (socket) {
        socket.emit('sync_audio_playback', {
          roomId: room.id,
          time: audioRef.current!.currentTime,
          isPlaying: true
        });
      }
    }).catch(error => {
      console.error('❌ Audio play error:', error);
      setAudioPlayerState(prev => ({ ...prev, error: '재생에 실패했습니다.' }));
    });
  }, [socket, room.id, currentTrack]);

  const handlePause = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setAudioPlayerState(prev => ({ ...prev, isPlaying: false }));
    
    // Socket.IO로 일시정지 상태 동기화
    if (socket) {
      socket.emit('sync_audio_playback', {
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
    
    // Socket.IO로 시간 동기화
    if (socket) {
      socket.emit('sync_audio_playback', {
        roomId: room.id,
        time,
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
      error: null,
      currentTime: 0,
      isPlaying: false
    }));
    
    setCurrentTrack(track);
    
    // 웨이브폼 데이터 생성 (더미)
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
      socket.emit('music_chat_message', newMessage);
    }
  }, [room.id, currentUser, audioPlayerState.currentTime, socket]);

  const handleVoiceMessage = useCallback(async (audioBlob: Blob) => {
    console.log('🎤 Recording voice message:', audioBlob);
    
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
      socket.emit('music_voice_message', voiceMessage);
    }
  }, [room.id, currentUser, audioPlayerState.currentTime, socket]);

  // ===== 파일 업로드 함수들 =====
  const handleFileUpload = useCallback(async (file: File) => {
    console.log('📁 Uploading file:', file.name);
    
    setShowUploader(false);
    
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
    
    // Socket.IO로 파일 업로드
    if (socket) {
      socket.emit('upload_audio_file', {
        file: await file.arrayBuffer(),
        fileName: file.name,
        roomId: room.id
      });
    }
  }, [currentUser, room.id, socket]);

  // ===== 웨이브폼 그리기 =====
  const drawWaveform = useCallback(() => {
    if (!waveformRef.current || !waveformData) return;
    
    const canvas = waveformRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const { data } = waveformData;
    
    // 캔버스 초기화
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // 웨이브폼 그리기
    ctx.strokeStyle = '#FF5500';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    const step = data.length / width;
    
    for (let x = 0; x < width; x++) {
      const index = Math.floor(x * step);
      const amplitude = data[index] || 0;
      const y = (height / 2) + (amplitude * height / 4);
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    
    // 재생 위치 표시
    if (audioPlayerState.duration > 0) {
      const progress = audioPlayerState.currentTime / audioPlayerState.duration;
      const progressX = progress * width;
      
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
    }
    
    // 채팅 메시지 표시
    chatMessages.forEach(msg => {
      if (msg.timestamp && audioPlayerState.duration > 0) {
        const msgProgress = msg.timestamp / audioPlayerState.duration;
        const msgX = msgProgress * width;
        
        ctx.fillStyle = msg.type === 'voice' ? '#FFAA00' : '#FF5500';
        ctx.fillRect(msgX - 1, height - 10, 2, 10);
      }
    });
    
  }, [waveformData, audioPlayerState, chatMessages]);

  // ===== 효과들 =====
  
  // 컴포넌트 마운트 시 더미 데이터 로드
  useEffect(() => {
    setPlaylist(dummyTracks);
    if (dummyTracks.length > 0) {
      handleTrackSelect(dummyTracks[0]);
    }
    
    // 더미 채팅 메시지
    const dummyMessages: ChatMessage[] = [
      {
        id: 'msg-1',
        roomId: room.id,
        user: 'producer_alex',
        message: '새로운 비트 업로드했어요! 확인해보세요',
        timestamp: 30,
        time: new Date(Date.now() - 300000).toISOString(),
        type: 'text'
      },
      {
        id: 'msg-2',
        roomId: room.id,
        user: 'beat_master',
        message: '이 부분 베이스 라인이 너무 좋네요 🔥',
        timestamp: 120,
        time: new Date(Date.now() - 180000).toISOString(),
        type: 'text'
      }
    ];
    
    setChatMessages(dummyMessages);
  }, [room.id, handleTrackSelect]);

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

    const handleError = () => {
      setAudioPlayerState(prev => ({ 
        ...prev, 
        isPlaying: false,
        error: '오디오 로딩에 실패했습니다.' 
      }));
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [handleNextTrack]);

  // 웨이브폼 다시 그리기
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

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

    const handleAudioFileUploaded = (file: AudioFile) => {
      setPlaylist(prev => [...prev, file]);
    };

    socket.on('audio_playback_sync', handleAudioSync);
    socket.on('music_chat_message', handleChatMessage);
    socket.on('music_voice_message', handleChatMessage);
    socket.on('audio_file_uploaded', handleAudioFileUploaded);

    return () => {
      socket.off('audio_playback_sync', handleAudioSync);
      socket.off('music_chat_message', handleChatMessage);
      socket.off('music_voice_message', handleChatMessage);
      socket.off('audio_file_uploaded', handleAudioFileUploaded);
    };
  }, [socket]);

  // 채팅 자동 스크롤
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // 포맷팅 함수들
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

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
      <header className={styles.roomHeader}>
        <div className={styles.roomInfo}>
          <h1 className={styles.roomTitle}>{room.name}</h1>
          <div className={styles.roomMeta}>
            <span className={styles.userCount}>
              👥 {connectedUsers.length}/{room.maxUsers}
            </span>
            <span className={styles.trackCount}>
              🎵 {playlist.length} tracks
            </span>
            <span className={styles.roomStatus}>
              🔴 LIVE
            </span>
          </div>
        </div>
        
        <div className={styles.roomControls}>
          <button
            onClick={() => setShowUploader(true)}
            className={styles.uploadBtn}
            disabled={!socket}
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
      </header>

      {/* 메인 콘텐츠 */}
      <main className={styles.mainContent}>
        {/* 왼쪽: 오디오 플레이어 & 웨이브폼 */}
        <section className={styles.audioSection}>
          {/* 현재 트랙 정보 */}
          <div className={styles.trackInfo}>
            {currentTrack ? (
              <>
                <div className={styles.trackArtwork}>
                  🎵
                </div>
                <div className={styles.trackDetails}>
                  <h3 className={styles.trackTitle}>{currentTrack.name}</h3>
                  <p className={styles.trackUploader}>by {currentTrack.uploader}</p>
                  <p className={styles.trackMeta}>
                    {formatTime(audioPlayerState.duration)} • {formatFileSize(currentTrack.size)}
                  </p>
                </div>
              </>
            ) : (
              <div className={styles.noTrack}>
                <p>트랙을 선택해주세요</p>
              </div>
            )}
            
            {audioPlayerState.isLoading && (
              <div className={styles.loadingIndicator}>
                <div className={styles.spinner}></div>
                <span>Loading...</span>
              </div>
            )}
          </div>

          {/* 오디오 컨트롤 */}
          <div className={styles.audioControls}>
            <button
              onClick={handlePreviousTrack}
              disabled={!currentTrack || playlist.length <= 1}
              className={styles.controlBtn}
            >
              ⏮
            </button>
            
            <button
              onClick={audioPlayerState.isPlaying ? handlePause : handlePlay}
              disabled={!currentTrack || audioPlayerState.isLoading}
              className={`${styles.playBtn} ${audioPlayerState.isPlaying ? styles.playing : ''}`}
            >
              {audioPlayerState.isPlaying ? '⏸' : '▶'}
            </button>
            
            <button
              onClick={handleNextTrack}
              disabled={!currentTrack || playlist.length <= 1}
              className={styles.controlBtn}
            >
              ⏭
            </button>
            
            <div className={styles.timeDisplay}>
              <span>{formatTime(audioPlayerState.currentTime)}</span>
              <span>/</span>
              <span>{formatTime(audioPlayerState.duration)}</span>
            </div>
            
            <div className={styles.volumeControl}>
              <span>🔊</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={audioPlayerState.volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className={styles.volumeSlider}
              />
            </div>
          </div>

          {/* 웨이브폼 */}
          <div className={styles.waveformContainer}>
            <canvas
              ref={waveformRef}
              width={800}
              height={200}
              className={styles.waveformCanvas}
              onClick={(e) => {
                if (!audioPlayerState.duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const progress = x / rect.width;
                const time = progress * audioPlayerState.duration;
                handleSeek(time);
              }}
            />
            
            {audioPlayerState.error && (
              <div className={styles.errorMessage}>
                ❌ {audioPlayerState.error}
              </div>
            )}
          </div>
        </section>

        {/* 오른쪽: 채팅 & 플레이리스트 */}
        <aside className={styles.sidePanel}>
          {/* 사이드 패널 탭 */}
          <div className={styles.sidePanelTabs}>
            <button
              onClick={() => setShowChat(true)}
              className={`${styles.tabBtn} ${showChat ? styles.active : ''}`}
            >
              💬 CHAT ({chatMessages.length})
            </button>
            <button
              onClick={() => setShowChat(false)}
              className={`${styles.tabBtn} ${!showChat ? styles.active : ''}`}
            >
              🎵 PLAYLIST ({playlist.length})
            </button>
          </div>

          {/* 채팅 섹션 */}
          {showChat && (
            <div className={styles.chatSection}>
              <div className={styles.connectedUsers}>
                <h4>연결된 사용자 ({connectedUsers.length}명)</h4>
                <div className={styles.userList}>
                  {connectedUsers.map(user => (
                    <span 
                      key={user.id} 
                      className={`${styles.userTag} ${user.username === currentUser ? styles.currentUser : ''}`}
                    >
                      {user.username}
                      {user.role === 'admin' && ' 👑'}
                    </span>
                  ))}
                </div>
              </div>

              <div 
                ref={chatContainerRef}
                className={styles.chatMessages}
              >
                {chatMessages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`${styles.chatMessage} ${msg.user === currentUser ? styles.ownMessage : ''}`}
                  >
                    <div className={styles.messageHeader}>
                      <strong className={styles.messageUser}>
                        {msg.user}
                        {msg.user === currentUser && ' (나)'}
                      </strong>
                      <span className={styles.messageTime}>
                        {new Date(msg.time).toLocaleTimeString()}
                      </span>
                      {msg.timestamp > 0 && (
                        <button
                          onClick={() => handleSeek(msg.timestamp)}
                          className={styles.timestampBtn}
                        >
                          @{formatTime(msg.timestamp)}
                        </button>
                      )}
                    </div>
                    <div className={styles.messageContent}>
                      {msg.type === 'voice' ? (
                        <div className={styles.voiceMessage}>
                          🎤 음성 메시지
                          {msg.audioUrl && (
                            <audio controls src={msg.audioUrl} />
                          )}
                        </div>
                      ) : (
                        msg.message
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.chatInput}>
                <MessageInput 
                  onSendMessage={handleSendMessage}
                  onVoiceMessage={handleVoiceMessage}
                  isRecording={isRecording}
                  onRecordingChange={setIsRecording}
                  currentTime={audioPlayerState.currentTime}
                />
              </div>
            </div>
          )}

          {/* 플레이리스트 섹션 */}
          {!showChat && (
            <div className={styles.playlistSection}>
              <div className={styles.playlistHeader}>
                <h4>플레이리스트</h4>
                <span className={styles.playlistCount}>{playlist.length}개 트랙</span>
              </div>
              
              <div className={styles.playlistTracks}>
                {playlist.map((track, index) => (
                  <div
                    key={track.id}
                    className={`${styles.trackItem} ${
                      currentTrack?.id === track.id ? styles.activeTrack : ''
                    }`}
                    onClick={() => handleTrackSelect(track)}
                  >
                    <div className={styles.trackNumber}>
                      {currentTrack?.id === track.id ? '▶' : index + 1}
                    </div>
                    <div className={styles.trackDetails}>
                      <div className={styles.trackName}>{track.name}</div>
                      <div className={styles.trackInfo}>
                        by {track.uploader} • {formatFileSize(track.size)}
                      </div>
                    </div>
                    <div className={styles.trackDuration}>
                      {formatTime(track.duration)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* 파일 업로드 모달 */}
      {showUploader && (
        <FileUploadModal
          onFileUpload={handleFileUpload}
          onClose={() => setShowUploader(false)}
        />
      )}
    </div>
  );
}

// ===== 하위 컴포넌트들 =====

// 메시지 입력 컴포넌트
interface MessageInputProps {
  onSendMessage: (message: string, timestamp?: number) => void;
  onVoiceMessage: (audioBlob: Blob) => void;
  isRecording: boolean;
  onRecordingChange: (recording: boolean) => void;
  currentTime: number;
}

function MessageInput({ 
  onSendMessage, 
  onVoiceMessage, 
  isRecording, 
  onRecordingChange,
  currentTime 
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [withTimestamp, setWithTimestamp] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim(), withTimestamp ? currentTime : undefined);
      setMessage('');
      setWithTimestamp(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        onVoiceMessage(audioBlob);
        
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      onRecordingChange(true);
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      alert('마이크 접근 권한이 필요합니다.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      onRecordingChange(false);
    }
  };

  return (
    <div className={styles.messageInput}>
      <div className={styles.inputRow}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="메시지를 입력하세요..."
          className={styles.textInput}
          disabled={isRecording}
        />
        
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`${styles.voiceBtn} ${isRecording ? styles.recording : ''}`}
        >
          {isRecording ? '⏹' : '🎤'}
        </button>
        
        <button
          onClick={handleSend}
          disabled={!message.trim() || isRecording}
          className={styles.sendBtn}
        >
          📤
        </button>
      </div>
      
      <div className={styles.inputOptions}>
        <label className={styles.timestampOption}>
          <input
            type="checkbox"
            checked={withTimestamp}
            onChange={(e) => setWithTimestamp(e.target.checked)}
          />
          현재 재생 위치에 댓글 달기 ({Math.floor(currentTime)}초)
        </label>
      </div>
      
      {isRecording && (
        <div className={styles.recordingIndicator}>
          🔴 녹음 중... 다시 클릭해서 완료
        </div>
      )}
    </div>
  );
}

// 파일 업로드 모달
interface FileUploadModalProps {
  onFileUpload: (file: File) => void;
  onClose: () => void;
}

function FileUploadModal({ onFileUpload, onClose }: FileUploadModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => file.type.startsWith('audio/'));
    
    if (audioFile) {
      onFileUpload(audioFile);
    } else {
      alert('오디오 파일만 업로드 가능합니다.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.uploadModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>🎵 오디오 파일 업로드</h3>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>
        
        <div 
          className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className={styles.dropZoneContent}>
            <div className={styles.uploadIcon}>📁</div>
            <p>파일을 드래그하거나 클릭해서 선택하세요</p>
            <p className={styles.supportedFormats}>
              지원 형식: MP3, WAV, OGG, WEBM, AAC (최대 50MB)
            </p>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        <div className={styles.modalFooter}>
          <p className={styles.uploadNote}>
            ⚠️ 업로드된 파일은 룸의 모든 사용자와 공유됩니다
          </p>
        </div>
      </div>
    </div>
  );
}