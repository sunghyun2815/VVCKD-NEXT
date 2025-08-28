'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/app/components/Header';
import { io, Socket } from 'socket.io-client';
import styles from './project.module.css';

interface MusicRoom {
  id: string;
  name: string;
  userCount: number;
  maxUsers: number;
  hasPassword: boolean;
  creator: string;
  description: string;
  tech: string[];
  status: 'active' | 'inactive';
}

interface Track {
  originalName: string;
  filename: string;
  url: string;
  uploader: string;
  uploadedAt?: string;
}

interface Comment {
  id: string;
  user: string;
  message: string;
  timestamp: number;
  time: string;
  type?: 'text' | 'voice';
  voiceUrl?: string;
}

interface User {
  id: string;
  username: string;
  role: 'ADMIN' | 'MEMBER';
  namespace: 'project';
}

export default function ProjectPage() {
  // ===== Socket & Connection State =====
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('연결 중...');
  const [connectedUsers, setConnectedUsers] = useState<number>(0);
  
  // ===== User State =====
  const [currentUser, setCurrentUser] = useState<User>({ id: '', username: '', role: 'MEMBER', namespace: 'project' });
  const [username, setUsername] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  
  // ===== Music Room State =====
  const [musicRooms, setMusicRooms] = useState<MusicRoom[]>([]);
  const [currentMusicRoom, setCurrentMusicRoom] = useState<MusicRoom | null>(null);
  const [showMusicRoom, setShowMusicRoom] = useState(false);
  
  // ===== Audio State =====
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [commentTime, setCommentTime] = useState(0);
  
  // ===== Comments State =====
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  
  // ===== Voice Recording State =====
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  // ===== Refs =====
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformData = useRef<number[]>([]);

  // ===== Socket 연결 및 이벤트 리스너 =====
  useEffect(() => {
    const newSocket = io('http://localhost:3001/project', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    // 연결 상태 관리
    newSocket.on('connect', () => {
      console.log('🎵 Connected to project namespace');
      setConnectionStatus('Connected');
      setConnectedUsers(1);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🎵 Disconnected:', reason);
      setConnectionStatus('Disconnected');
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    // 사용자 로그인 성공
    newSocket.on('user:login_success', (data) => {
      console.log('👤 Login success:', data.user);
      setCurrentUser(data.user);
      setConnectedUsers(data.connectedUsers);
      setShowLogin(false);
    });

    // 룸 목록 업데이트
    newSocket.on('rooms:list', (roomsList: MusicRoom[]) => {
      console.log('🎵 Music rooms updated:', roomsList.length);
      setMusicRooms(roomsList);
    });

    // 룸 생성 성공
    newSocket.on('room:created', (data) => {
      console.log('🎵 Room created:', data.room);
      if (data.room) {
        joinMusicRoom(data.room.id);
      }
    });

    // 뮤직룸 참여 성공
    newSocket.on('music:room_joined', (data) => {
      console.log('🎵 Joined music room:', data.room);
      setCurrentMusicRoom(data.room);
      setComments(data.comments || []);
      setShowMusicRoom(true);
    });

    // 음악 업로드 이벤트 (수정됨)
    newSocket.on('music uploaded', (data) => {
      console.log('🎵 Music uploaded event received:', data);
      
      // 트랙 데이터 구조 정리
      const track: Track = {
        originalName: data.track?.originalName || 'Unknown',
        filename: data.track?.filename || '',
        url: data.track?.url || '',
        uploader: data.uploader || 'Unknown'
      };
      
      console.log('🎵 Setting current track:', track);
      
      // 현재 트랙 설정
      setCurrentTrack(track);
      
      // 오디오 로드
      if (track.url) {
        console.log('🎵 Loading audio track:', track.url);
        loadAudioTrack(track.url);
      }
      
      // 시스템 메시지 추가
      const systemComment: Comment = {
        id: `system_${Date.now()}`,
        user: 'SYSTEM',
        message: `🎵 ${track.uploader}님이 "${track.originalName}"을 업로드했습니다.`,
        timestamp: 0,
        time: new Date().toISOString(),
        type: 'text'
      };
      setComments(prev => [...prev, systemComment]);
    });

    // 플레이백 동기화 (기존 이벤트명 유지)
    newSocket.on('playback toggled', (data) => {
      console.log('🎵 Playback toggled:', data.isPlaying);
      setIsPlaying(data.isPlaying);
      if (audioRef.current) {
        if (data.isPlaying) {
          audioRef.current.play().catch(e => console.error('Play error:', e));
        } else {
          audioRef.current.pause();
        }
      }
      
      const systemComment: Comment = {
        id: `system_${Date.now()}`,
        user: 'SYSTEM',
        message: `🎵 ${data.user}님이 음악을 ${data.isPlaying ? '재생' : '일시정지'}했습니다.`,
        timestamp: currentTime,
        time: new Date().toISOString(),
        type: 'text'
      };
      setComments(prev => [...prev, systemComment]);
    });

    // 음악 채팅 (기존 이벤트명 유지)
    newSocket.on('music chat message', (comment: Comment) => {
      console.log('💬 Music comment:', comment);
      const formattedComment = {
        ...comment,
        type: comment.type || 'text'
      };
      setComments(prev => [...prev, formattedComment]);
    });

    // 사용자 입장/퇴장
    newSocket.on('music:user_joined', (data) => {
      console.log('👋 User joined music room:', data.user?.username);
    });

    newSocket.on('music:user_left', (data) => {
      console.log('👋 User left music room:', data.user?.username);
    });

    newSocket.on('room:error', (error) => {
      console.error('❌ Music Room error:', error);
      alert(`Room Error: ${error.message}`);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // ===== 강화된 오디오 트랙 로드 함수 =====
  const loadAudioTrack = useCallback((url: string) => {
    console.log('🎵 Loading audio track:', url);
    
    if (!audioRef.current) {
      console.error('❌ Audio ref is null');
      return;
    }

    const audio = audioRef.current;

    // 기존 이벤트 리스너 모두 제거
    const events = ['loadedmetadata', 'timeupdate', 'error', 'canplay', 'loadstart', 'loadeddata'];
    events.forEach(event => {
      audio.removeEventListener(event, () => {});
    });

    // 오디오 초기화
    audio.pause();
    audio.currentTime = 0;
    
    // 새로운 이벤트 리스너들
    let metadataLoaded = false;
    let loadTimeout: NodeJS.Timeout;

    const onLoadStart = () => {
      console.log('🎵 Audio load started');
    };

    const onLoadedData = () => {
      console.log('🎵 Audio data loaded');
    };

    const onCanPlay = () => {
      console.log('🎵 Audio can play');
    };

    const onLoadedMetadata = () => {
      if (metadataLoaded) return;
      metadataLoaded = true;
      
      console.log('✅ Audio metadata loaded');
      console.log('🎵 Duration:', audio.duration);
      console.log('🎵 Ready state:', audio.readyState);
      
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setTotalTime(audio.duration);
        generateWaveform();
        clearTimeout(loadTimeout);
      } else {
        console.error('❌ Invalid duration:', audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setCommentTime(audio.currentTime);
    };

    const onError = (e: Event) => {
      clearTimeout(loadTimeout);
      console.error('❌ Audio error:', e);
      
      if (audio.error) {
        console.error('Error code:', audio.error.code);
        console.error('Error message:', audio.error.message);
        
        let errorMsg = '';
        switch(audio.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMsg = '재생이 중단되었습니다';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMsg = '네트워크 오류';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMsg = '디코딩 오류';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMsg = '지원하지 않는 파일 형식';
            break;
          default:
            errorMsg = '알 수 없는 오류';
        }
        
        alert(`오디오 로딩 실패: ${errorMsg}`);
      }
    };

    // 이벤트 리스너 등록
    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('loadeddata', onLoadedData);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('error', onError);

    // 파일 URL 먼저 검증
    fetch(url, { method: 'HEAD' })
      .then(response => {
        console.log('📡 File access test:', response.status, response.statusText);
        console.log('📡 Content-Type:', response.headers.get('content-type'));
        console.log('📡 Content-Length:', response.headers.get('content-length'));
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // 파일 접근 가능하면 오디오 로드
        console.log('🎵 Setting audio source');
        audio.src = url;
        audio.load();
        
        // 10초 타임아웃 설정
        loadTimeout = setTimeout(() => {
          if (!metadataLoaded) {
            console.error('❌ Audio loading timeout after 10 seconds');
            console.log('Current audio state:', {
              src: audio.src,
              readyState: audio.readyState,
              networkState: audio.networkState,
              duration: audio.duration,
              error: audio.error
            });
            
            // 브라우저 호환성 체크
            const canPlayMp3 = audio.canPlayType('audio/mpeg');
            const canPlayWav = audio.canPlayType('audio/wav');
            const canPlayOgg = audio.canPlayType('audio/ogg');
            
            console.log('Browser audio support:', {
              mp3: canPlayMp3,
              wav: canPlayWav,
              ogg: canPlayOgg
            });
            
            alert('오디오 로딩 시간이 초과되었습니다. 파일 형식이나 크기를 확인해주세요.');
          }
        }, 10000);
        
      })
      .catch(error => {
        console.error('📡 File access failed:', error);
        alert(`파일에 접근할 수 없습니다: ${error.message}`);
      });

  }, []);

  // ===== 웨이브폼 생성 함수 =====
  const generateWaveform = useCallback(async () => {
    if (!audioRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);
    
    const samples = 200;
    waveformData.current = Array.from({length: samples}, () => Math.random() * height * 0.8);
    
    drawWaveform();
  }, []);

  // ===== 웨이브폼 그리기 함수 =====
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    const samples = waveformData.current.length;
    const barWidth = width / samples;
    
    waveformData.current.forEach((amplitude, i) => {
      const x = i * barWidth;
      const barHeight = amplitude;
      
      const progress = currentTime / totalTime;
      const isPlayed = i < samples * progress;
      
      ctx.fillStyle = isPlayed ? '#ff6600' : '#333';
      ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
    });
  }, [currentTime, totalTime]);

  // ===== 유틸리티 함수들 =====
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleWaveformClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || !totalTime) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const progress = x / canvas.width;
    const newTime = progress * totalTime;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
    drawWaveform();
  };

  // ===== 기본 함수들 =====
  const handleLogin = () => {
    if (!username.trim() || !socket) return;

    const userData = {
      username: username.trim(),
      role: 'MEMBER'
    };

    socket.emit('user:login', userData);
  };

  const createMusicRoom = () => {
    if (!socket) return;

    const roomName = prompt('룸 이름을 입력하세요:');
    if (!roomName?.trim()) return;

    const roomData = {
      name: roomName.trim(),
      description: '',
      password: '',
      maxUsers: 10
    };

    socket.emit('room:create', roomData);
  };

  const joinMusicRoom = (roomId: string, password: string = '') => {
    if (!socket) return;

    const joinData = { roomId, password };
    socket.emit('room:join', joinData);
  };

  const leaveMusicRoom = () => {
    setCurrentMusicRoom(null);
    setCurrentTrack(null);
    setComments([]);
    setIsPlaying(false);
    setShowMusicRoom(false);
    setCurrentTime(0);
    setTotalTime(0);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // ===== 플레이어 제어 함수 =====
  const togglePlayback = () => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => {
        console.error('Play error:', e);
        alert('재생에 실패했습니다. 오디오 파일을 확인해주세요.');
      });
      setIsPlaying(true);
    }

    // 서버에 동기화 알림
    if (socket && currentMusicRoom) {
      socket.emit('toggle playback', {
        roomId: currentMusicRoom.id
      });
    }
  };

  // ===== 파일 업로드 함수 (개선됨) =====
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentMusicRoom) return;

    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    console.log('🎵 Starting file upload...', file.name);

    const formData = new FormData();
    formData.append('music', file);
    
    try {
      const response = await fetch('/api/upload/music', {
        method: 'POST',
        body: formData
      });

      console.log('📡 Upload response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed:', errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Upload success:', data);
      
      if (data.success && socket) {
        // 서버 응답 구조에 맞게 수정
        socket.emit('music uploaded', {
          roomId: currentMusicRoom.id,
          musicData: {
            originalname: data.file.originalName,
            filename: data.file.filename,
            url: data.file.url
          }
        });
        
        console.log('🎵 Music upload event sent to server');
      } else {
        throw new Error('Upload response indicates failure');
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ===== 댓글 추가 함수 =====
  const addComment = () => {
    if (!newComment.trim() || !currentMusicRoom || !socket) return;

    const commentData = {
      roomId: currentMusicRoom.id,
      user: currentUser.username,
      message: newComment.trim(),
      timestamp: commentTime
    };

    socket.emit('music chat message', commentData);
    setNewComment('');
  };

  // ===== 음성 녹음 함수 =====
  const toggleVoiceRecording = async () => {
    if (isRecording) {
      if (mediaRecorder) {
        mediaRecorder.stop();
        setIsRecording(false);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/wav' });
          const formData = new FormData();
          formData.append('voice', blob, `voice_${Date.now()}.wav`);

          try {
            const response = await fetch('/api/upload/voice', {
              method: 'POST',
              body: formData
            });

            if (response.ok) {
              const data = await response.json();
              if (socket && currentMusicRoom) {
                socket.emit('music chat message', {
                  roomId: currentMusicRoom.id,
                  user: currentUser.username,
                  message: `🎤 음성 메시지`,
                  timestamp: commentTime,
                  type: 'voice',
                  voiceUrl: data.file.url
                });
              }
            }
          } catch (error) {
            console.error('Voice upload failed:', error);
          }

          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (error) {
        console.error('Voice recording failed:', error);
        alert('마이크 접근에 실패했습니다.');
      }
    }
  };

  // ===== useEffect for waveform drawing =====
  useEffect(() => {
    if (currentTrack && totalTime > 0) {
      drawWaveform();
    }
  }, [currentTime, totalTime, currentTrack, drawWaveform]);

  // ===== 렌더링 부분 =====

  // 로그인 화면
  if (showLogin) {
    return (
      <div className={styles.projectContainer}>
        <Header />
        
        <div className={styles.userInfo}>
          USER: <span>{currentUser.username || 'Guest'}</span>
          <span className={styles.userRole}>[{currentUser.role}]</span>
        </div>

        <div className={styles.loginModal}>
          <div className={styles.loginTerminal}>
            <div className={styles.loginTitle}>MUSIC ACCESS TERMINAL</div>
            <div className={styles.loginSubtitle}>ENTER USER CREDENTIALS</div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="USERNAME"
              className={styles.loginInput}
              maxLength={20}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              onClick={handleLogin}
              disabled={!username.trim()}
              className={styles.loginBtn}
            >
              INITIALIZE CONNECTION
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 뮤직룸 화면
  if (showMusicRoom && currentMusicRoom) {
    return (
      <div className={styles.musicRoom}>
        <Header />
        
        <div className={styles.musicRoomHeader}>
          <div className={styles.roomTitle}>{currentMusicRoom.name}</div>
          <button onClick={leaveMusicRoom} className={styles.leaveBtn}>
            LEAVE ROOM
          </button>
        </div>

        <div className={styles.musicContent}>
          {/* 숨겨진 오디오 엘리먼트 */}
          <audio ref={audioRef} style={{ display: 'none' }} />

          {/* 트랙 헤더 */}
          <div className={styles.trackHeaderSimple}>
            <div className={styles.trackInfoLeft}>
              <div className={styles.trackTitleSimple}>
                {currentTrack ? currentTrack.originalName : 'No track selected'}
              </div>
              <div className={styles.trackUploaderSimple}>
                {currentTrack ? `업로드: ${currentTrack.uploader}` : 'Upload a track to get started'}
              </div>
            </div>
            <div className={styles.trackActions}>
              <button 
                onClick={() => currentTrack && window.open(currentTrack.url, '_blank')}
                disabled={!currentTrack}
                className={styles.downloadBtn}
              >
                📥 DOWNLOAD
              </button>
            </div>
          </div>

          {/* 웨이브폼 영역 */}
          <div className={styles.waveformMainArea}>
            <div className={styles.waveformContainerMain}>
              <canvas
                ref={canvasRef}
                className={styles.waveformCanvasMain}
                onClick={handleWaveformClick}
                style={{ display: currentTrack ? 'block' : 'none' }}
              />
              {!currentTrack && (
                <div className={styles.waveformLoadingMain}>
                  🎵 Upload a track to see waveform<br />
                  Drag and drop or click upload button
                </div>
              )}
            </div>

            {/* 시간 표시 */}
            <div className={styles.timeDisplay}>
              <div>
                <span className={styles.timeCurrent}>{formatTime(currentTime)}</span>
                <span className={styles.timeSeparator}>/</span>
                <span className={styles.timeTotal}>{formatTime(totalTime)}</span>
              </div>
            </div>

            {/* 컨트롤 */}
            <div className={styles.simpleControls}>
              <button 
                onClick={togglePlayback}
                disabled={!currentTrack}
                className={styles.playBtnMain}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="audio/*"
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={styles.uploadBtnMain}
              >
                🎵 UPLOAD MUSIC
              </button>
            </div>
          </div>

          {/* 댓글 섹션 */}
          <div className={styles.commentsSection}>
            <div className={styles.commentInputArea}>
              <div className={styles.commentTimeIndicator}>
                {formatTime(commentTime)}
              </div>
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add your comment here, mention users with @"
                className={styles.commentInput}
                onKeyPress={(e) => e.key === 'Enter' && addComment()}
              />
              <button
                onClick={toggleVoiceRecording}
                className={`${styles.commentBtn} ${styles.voice} ${isRecording ? styles.recording : ''}`}
              >
                {isRecording ? '🛑 STOP' : '🎤 VOICE'}
              </button>
              <button
                onClick={addComment}
                disabled={!newComment.trim()}
                className={`${styles.commentBtn} ${styles.send}`}
              >
                SEND
              </button>
            </div>

            <div className={styles.commentsList}>
              {comments.map((comment) => (
                <div key={comment.id} className={styles.commentItem}>
                  <div className={styles.commentHeader}>
                    <span className={styles.commentUser}>{comment.user}</span>
                    <span className={styles.commentTime}>
                      {formatTime(comment.timestamp)}
                    </span>
                  </div>
                  <div className={styles.commentContent}>
                    {comment.type === 'voice' && comment.voiceUrl ? (
                      <audio controls src={comment.voiceUrl} className={styles.voiceMessage} />
                    ) : (
                      comment.message
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 메인 룸 목록 화면
  return (
    <div className={styles.projectContainer}>
      <Header />
      
      <div className={styles.userInfo}>
        USER: <span>{currentUser.username}</span>
        <span className={styles.userRole}>[{currentUser.role}]</span>
      </div>

      <div className={styles.createSection}>
        <button onClick={createMusicRoom} className={styles.createRoomBtn}>
          CREATE MUSIC ROOM
        </button>
      </div>

      <div className={styles.mainContainer}>
        <div className={styles.projectHeader}>
          <h1>MUSIC COLLABORATION<span className={styles.cursor}>_</span></h1>
          <div className={styles.statusText}>
            연결된 사용자: {connectedUsers} | 활성 룸: {musicRooms.length}
            <br />
            상태: <span className={connectionStatus === 'Connected' ? styles.connected : styles.disconnected}>
              {connectionStatus}
            </span>
          </div>
        </div>

        {musicRooms.length === 0 ? (
          <div className={styles.emptyRooms}>
            <div className={styles.emptyIcon}>🎵</div>
            <div className={styles.emptyTitle}>음악 룸이 없습니다</div>
            <div className={styles.emptyDescription}>
              첫 번째 음악 협업 룸을 만들어보세요!
            </div>
          </div>
        ) : (
          <div className={styles.roomsGrid}>
            {musicRooms.map((room) => (
              <div
                key={room.id}
                className={styles.roomCard}
                onClick={() => {
                  if (room.hasPassword) {
                    const password = prompt('비밀번호를 입력하세요:');
                    if (password) joinMusicRoom(room.id, password);
                  } else {
                    joinMusicRoom(room.id);
                  }
                }}
              >
                <div className={styles.roomHeader}>
                  <div className={styles.roomName}>{room.name}</div>
                  <div className={styles.roomStatus}>
                    {room.hasPassword && '🔒'}
                    <span className={room.status === 'active' ? styles.active : styles.inactive}>
                      ●
                    </span>
                  </div>
                </div>
                <div className={styles.roomInfo}>
                  <div className={styles.roomUsers}>
                    👥 {room.userCount}/{room.maxUsers}
                  </div>
                  <div className={styles.roomCreator}>
                    by {room.creator}
                  </div>
                </div>
                {room.description && (
                  <div className={styles.roomDescription}>
                    {room.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}