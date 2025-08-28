'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/app/components/Header';
import styles from './project.module.css';
import { io, Socket } from 'socket.io-client';

interface MusicRoom {
  id: string;
  name: string;
  description: string;
  participants: number;
  maxUsers: number;
  musicCount: number;
  status: 'active' | 'paused' | 'completed';
  createdBy: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
  hasPassword: boolean;
  lastMessage: string;
  lastMessageTime: number;
}

interface User {
  id: string;
  username: string;
  role: string;
}

interface Comment {
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

interface Track {
  id: string;
  name: string;
  filename: string;
  url: string;
  size: number;
  duration?: number;
  uploader: string;
  uploadedAt: string;
  roomId: string;
}

export default function ProjectPage() {
  // Socket 및 연결 상태
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [connectedUsers, setConnectedUsers] = useState<number>(0);
  
  // 사용자 상태
  const [currentUser, setCurrentUser] = useState<User>({ id: 'GUEST', username: 'GUEST', role: 'MEMBER' });
  const [username, setUsername] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  
  // 음악 룸 상태
  const [musicRooms, setMusicRooms] = useState<MusicRoom[]>([]);
  const [currentMusicRoom, setCurrentMusicRoom] = useState<MusicRoom | null>(null);
  const [showMusicRoomView, setShowMusicRoomView] = useState(false);
  
  // 🎵 음악 플레이어 상태 (project.html 기반)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentTime, setCommentTime] = useState(0);
  
  // 🎤 음성 녹음 상태
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // Refs
  const loginInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformData = useRef<number[]>([]);

  // Socket.IO 연결
  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      autoConnect: true,
      timeout: 20000,
      transports: ['polling', 'websocket'],
      forceNew: true
    });
    
    setSocket(newSocket);

    // 연결 이벤트
    newSocket.on('connect', () => {
      setConnectionStatus('Connected');
      console.log('🔗 Music Socket connected:', newSocket.id);
    });

    newSocket.on('connect_error', (error: Error) => {
      setConnectionStatus('Connection Failed');
      console.error('❌ Music Connection error:', error);
    });

    newSocket.on('disconnect', (reason: string) => {
      setConnectionStatus('Disconnected');
      console.log('🔌 Music Disconnected:', reason);
    });

    // VLYNK 서버 이벤트
    newSocket.on('welcome', (data: any) => {
      console.log('🎉 Music Welcome:', data.message);
    });

    newSocket.on('user:registered', (userData: any) => {
      setCurrentUser({
        id: userData.id,
        username: userData.username || 'GUEST',
        role: 'MEMBER'
      });
      console.log('👤 Music User registered:', userData);
    });

    newSocket.on('users:updated', (data: any) => {
      const userCount = data.totalUsers || data.users?.length || 0;
      setConnectedUsers(userCount);
    });

    // 음악 룸 목록 관련 이벤트
    newSocket.on('rooms:list', (data: any) => {
      console.log('📝 Music Rooms list received:', data.rooms);
      const musicRoomsList = data.rooms.map((room: any) => ({
        id: room.id,
        name: room.name,
        description: room.description || 'Music collaboration room',
        participants: room.userCount || 0,
        maxUsers: room.maxUsers || 10,
        musicCount: 0,
        status: 'active' as const,
        createdBy: room.creator,
        creator: room.creator,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        hasPassword: room.hasPassword || false,
        lastMessage: room.lastMessage || 'Room created!',
        lastMessageTime: room.lastMessageTime || Date.now()
      }));
      setMusicRooms(musicRoomsList);
    });

    newSocket.on('room:created', (data: any) => {
      console.log('🎵 New music room created:', data);
      requestRoomList();
    });

    newSocket.on('room:joined', (data: any) => {
      console.log('🎵 Successfully joined music room:', data);
      
      if (data.type === 'music') {
        const roomInfo: MusicRoom = {
          id: data.roomId,
          name: data.roomName,
          description: 'Music collaboration room',
          participants: data.userCount,
          maxUsers: data.maxUsers,
          musicCount: 0,
          status: 'active',
          createdBy: data.creator || 'Unknown',
          creator: data.creator || 'Unknown',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          hasPassword: false,
          lastMessage: 'Welcome to the music room!',
          lastMessageTime: Date.now()
        };
        
        setCurrentMusicRoom(roomInfo);
        setShowMusicRoomView(true);
        setComments([]); // 댓글 초기화
        console.log('🎵 Switched to music room view:', roomInfo);
        
        // 방 참여 후 기존 메시지 로드 요청
        setTimeout(() => {
          if (socket) {
            socket.emit('get music room messages', { roomId: data.roomId });
          }
        }, 500);
      }
      
      setTimeout(() => requestRoomList(), 500);
    });

    // 🎵 음악 관련 이벤트들 (project.html 기반) - 서버 이벤트명에 맞춤
    newSocket.on('music uploaded', (data: any) => {
      console.log('🎵 Music uploaded:', data);
      if (data.trackData) {
        const track: Track = {
          id: data.trackData.id,
          name: data.trackData.title,
          filename: data.trackData.filename,
          url: data.trackData.url,
          size: 0,
          uploader: data.trackData.uploader,
          uploadedAt: new Date().toISOString(),
          roomId: data.roomId
        };
        setCurrentTrack(track);
        loadAudioTrack(track.url);
      }
    });

    newSocket.on('track changed', (data: any) => {
      console.log('🎵 Track changed:', data);
      if (data.currentTrack) {
        const track: Track = {
          id: data.currentTrack.id,
          name: data.currentTrack.title,
          filename: data.currentTrack.filename,
          url: data.currentTrack.url,
          size: 0,
          uploader: data.currentTrack.uploader,
          uploadedAt: new Date().toISOString(),
          roomId: currentMusicRoom?.id || ''
        };
        setCurrentTrack(track);
        loadAudioTrack(track.url);
        
        if (data.isPlaying && audioRef.current) {
          audioRef.current.play();
        }
      }
    });

    newSocket.on('playback synced', (data: any) => {
      console.log('🎵 Playback sync:', data);
      if (audioRef.current) {
        audioRef.current.currentTime = data.currentTime || 0;
        if (data.isPlaying && audioRef.current.paused) {
          audioRef.current.play();
          setIsPlaying(true);
        } else if (!data.isPlaying && !audioRef.current.paused) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
    });

    // 🎯 핵심 수정: 서버의 이벤트 이름에 맞춤
    newSocket.on('music chat message', (comment: any) => {
      console.log('💬 Music chat message received:', comment);
      
      // 🕐 시간 포맷팅 함수 (여기서 정의)
      const formatTimeLocal = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      };
      
      const formattedComment: Comment = {
        id: comment.id || Date.now().toString(),
        user: comment.user,
        text: comment.message,
        timestamp: comment.timestamp || 0,
        audioTimestamp: comment.timestamp || 0, // 서버에서 오디오 타임스탬프 사용
        time: formatTimeLocal(comment.timestamp || 0),
        roomId: comment.roomId,
        audioUrl: comment.audioUrl,
        type: comment.audioUrl ? 'voice' : 'text'
      };
      
      setComments(prev => [...prev, formattedComment]);
    });

    newSocket.on('room:user_joined', (data: any) => {
      console.log('👥 User joined room:', data);
      requestRoomList();
    });

    newSocket.on('room:user_left', (data: any) => {
      console.log('👋 User left room:', data);
      requestRoomList();
    });

    newSocket.on('room:error', (error: any) => {
      console.error('❌ Music Room error:', error);
      alert(`Room Error: ${error.message}`);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // 🎵 오디오 트랙 로드 및 웨이브폼 생성 (project.html 기반)
  const loadAudioTrack = (url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) {
          setTotalTime(audioRef.current.duration);
          generateWaveform();
        }
      });
      
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          setCommentTime(audioRef.current.currentTime);
        }
      });
    }
  };

  // 🎨 웨이브폼 생성 (project.html 기반)
  const generateWaveform = async () => {
    if (!audioRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 간단한 더미 웨이브폼 생성 (실제로는 Web Audio API 사용)
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);
    
    // 더미 웨이브폼 데이터
    const samples = 200;
    waveformData.current = Array.from({length: samples}, () => Math.random() * height * 0.8);
    
    drawWaveform();
  };

  // 🎨 웨이브폼 그리기
  const drawWaveform = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    // 웨이브폼 그리기
    const samples = waveformData.current.length;
    const barWidth = width / samples;
    
    waveformData.current.forEach((amplitude, i) => {
      const x = i * barWidth;
      const barHeight = amplitude;
      
      // 현재 재생 위치 이전은 주황색, 이후는 회색
      const progress = currentTime / totalTime;
      const isPlayed = i < samples * progress;
      
      ctx.fillStyle = isPlayed ? '#ff6600' : '#444';
      ctx.fillRect(x, (height - barHeight) / 2, barWidth - 1, barHeight);
    });

    // 플레이헤드 그리기
    if (totalTime > 0) {
      const playheadX = (currentTime / totalTime) * width;
      ctx.fillStyle = '#9d4edd';
      ctx.fillRect(playheadX - 1, 0, 2, height);
      ctx.shadowColor = 'rgba(157, 78, 221, 0.6)';
      ctx.shadowBlur = 8;
      ctx.fillRect(playheadX - 1, 0, 2, height);
      ctx.shadowBlur = 0;
    }
  };

  // 웨이브폼 업데이트
  useEffect(() => {
    drawWaveform();
  }, [currentTime, totalTime]);

  // 로그인 처리
  const handleLogin = () => {
    if (username.trim() && socket) {
      console.log('🔑 Music Login attempt:', username.trim());
      
      socket.emit('user:register', {
        username: username.trim(),
        type: 'music'
      });
      
      setTimeout(() => {
        setUsername(username.trim());
        setShowLogin(false);
        requestRoomList();
      }, 500);
    }
  };

  // 룸 목록 요청
  const requestRoomList = () => {
    if (socket && currentUser.id !== 'GUEST') {
      console.log('📋 Requesting music room list...');
      socket.emit('rooms:list', { type: 'music' });
    }
  };

  // 음악 룸 생성
  const createMusicRoom = () => {
    const name = prompt('Enter music room name:');
    if (!name) return;
    
    const description = prompt('Enter room description:') || 'Music collaboration room';
    const maxUsersInput = prompt('Maximum users (default: 10):');
    const maxUsers = maxUsersInput ? parseInt(maxUsersInput) : 10;

    if (socket && currentUser.id !== 'GUEST') {
      const roomData = {
        name: name.trim(),
        password: '',
        maxUsers: maxUsers,
        description: description.trim(),
        type: 'music'
      };
      
      console.log('🎵 Creating music room:', roomData);
      socket.emit('room:create', roomData);
    } else {
      alert('Please login first!');
    }
  };

  // 음악 룸 참여
  const joinMusicRoom = (roomId: string) => {
    if (socket && currentUser.id !== 'GUEST') {
      console.log('🎵 Attempting to join music room:', roomId);
      
      const room = musicRooms.find(r => r.id === roomId);
      let password = '';
      
      if (room?.hasPassword) {
        password = prompt('Enter room password:') || '';
        if (!password) return;
      }
      
      socket.emit('room:join', { 
        roomId,
        type: 'music',
        password: password
      });
      
      console.log('📤 Sent room:join event');
    } else {
      alert('Please login first!');
    }
  };

  // 🎵 음악 플레이어 제어 (project.html 기반) - 서버 이벤트명에 맞춤
  const togglePlayback = () => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }

    // 다른 사용자들에게 동기화 - 서버 이벤트명에 맞춤
    if (socket && currentMusicRoom) {
      socket.emit('toggle playback', {
        roomId: currentMusicRoom.id
      });
    }
  };

  // 🎵 파일 업로드 (project.html 기반) - 서버 이벤트명에 맞춤
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentMusicRoom) return;

    // 오디오 파일인지 확인
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file');
      return;
    }

    // 파일 크기 체크 (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    const formData = new FormData();
    formData.append('music', file);
    
    fetch('/api/upload/music', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.success && socket) {
        // 서버 이벤트명에 맞춤
        socket.emit('music uploaded', {
          roomId: currentMusicRoom.id,
          musicData: {
            originalname: data.file.originalName,
            filename: data.file.filename,
            url: data.file.url
          }
        });
        
        console.log('🎵 Music upload event sent to server');
      }
    })
    .catch(error => {
      console.error('Upload error:', error);
      alert('Upload failed');
    });
  };

  // 💬 댓글 추가 (project.html 기반) - 서버 이벤트명에 맞춤
  const addComment = () => {
    if (!newComment.trim() || !currentMusicRoom || !socket) return;

    // 서버가 기대하는 형식으로 데이터 전송
    const commentData = {
      roomId: currentMusicRoom.id,
      user: currentUser.username,
      message: newComment.trim(),
      timestamp: commentTime // 현재 오디오 재생 시간
    };

    console.log('💬 Sending comment to server:', commentData);
    socket.emit('music chat message', commentData);
    setNewComment('');
  };

  // 🎤 음성 댓글 녹음 (project.html 기반)
  const toggleVoiceRecording = async () => {
    if (isRecording) {
      // 녹음 중지
      if (mediaRecorder) {
        mediaRecorder.stop();
        setIsRecording(false);
      }
    } else {
      // 녹음 시작
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = []; // 로컬 청크 배열
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          uploadVoiceComment(blob);
          
          // 스트림 정지
          stream.getTracks().forEach(track => track.stop());
        };
        
        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (error) {
        console.error('Voice recording error:', error);
        alert('마이크 접근 권한이 필요합니다');
      }
    }
  };

  // 🎤 음성 댓글 업로드 - 서버 이벤트명에 맞춤
  const uploadVoiceComment = (blob: Blob) => {
    if (!currentMusicRoom || !socket) return;

    const formData = new FormData();
    formData.append('voice', blob, `voice_${Date.now()}.webm`);
    
    fetch('/api/upload/voice', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // 서버가 기대하는 형식으로 음성 메시지 전송
        const voiceData = {
          roomId: currentMusicRoom.id,
          user: currentUser.username,
          timestamp: commentTime,
          audioUrl: data.file.url
        };

        console.log('🎤 Sending voice message to server:', voiceData);
        socket.emit('music voice message', voiceData);
      }
    })
    .catch(error => {
      console.error('Voice upload error:', error);
    });
  };

  // 🎵 음악룸에서 나가기 - 서버 이벤트명에 맞춤
  const leaveMusicRoom = () => {
    if (socket && currentMusicRoom) {
      console.log('👋 Leaving music room:', currentMusicRoom.id);
      
      // 서버 이벤트명에 맞춤
      socket.emit('leave music room', { 
        roomId: currentMusicRoom.id
      });
      
      // 오디오 정지
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      setCurrentMusicRoom(null);
      setShowMusicRoomView(false);
      setCurrentTrack(null);
      setComments([]);
      setIsPlaying(false);
      setCurrentTime(0);
      setTotalTime(0);
      
      setTimeout(() => requestRoomList(), 500);
    }
  };

  // 🕐 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 🎯 boombox.io 스타일 음악룸 뷰 (project.html 기반)
  if (showMusicRoomView && currentMusicRoom) {
    return (
      <>
        <Header />
        <div className={styles.musicRoom}>
          {/* 음악룸 헤더 */}
          <div className={styles.musicRoomHeader}>
            <div className={styles.roomTitle}>{currentMusicRoom.name}</div>
            <button className={styles.leaveBtn} onClick={leaveMusicRoom}>
              LEAVE ROOM
            </button>
          </div>

          <div className={styles.musicContent}>
            {/* 트랙 헤더 */}
            <div className={styles.trackHeaderSimple}>
              <div className={styles.trackInfoLeft}>
                <div className={styles.trackTitleSimple}>
                  {currentTrack ? currentTrack.name : 'No track selected'}
                </div>
                <div className={styles.trackUploaderSimple}>
                  {currentTrack ? `Uploaded by ${currentTrack.uploader}` : 'Upload a track to get started'}
                </div>
              </div>
              <div className={styles.trackActions}>
                {currentTrack && (
                  <a 
                    href={currentTrack.url} 
                    download 
                    className={styles.downloadBtn}
                  >
                    📥 DOWNLOAD
                  </a>
                )}
              </div>
            </div>

            {/* 메인 웨이브폼 영역 */}
            <div className={styles.waveformMainArea}>
              <div className={styles.waveformContainerMain}>
                <canvas 
                  ref={canvasRef}
                  className={styles.waveformCanvasMain}
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

              {/* 간단한 컨트롤 */}
              <div className={styles.simpleControls}>
                <button 
                  className={styles.playBtnMain} 
                  onClick={togglePlayback}
                  disabled={!currentTrack}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button 
                  className={styles.uploadBtnMain} 
                  onClick={() => fileInputRef.current?.click()}
                >
                  🔎 UPLOAD MUSIC
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
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
                  className={styles.commentInput}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addComment()}
                  placeholder="Add your comment here, mention users with @"
                />
                <button 
                  className={`${styles.commentBtn} ${styles.voice}`}
                  onClick={toggleVoiceRecording}
                >
                  {isRecording ? '⏹ STOP' : '🎤 VOICE'}
                </button>
                <button 
                  className={`${styles.commentBtn} ${styles.send}`}
                  onClick={addComment}
                >
                  SEND
                </button>
              </div>
              
              <div className={styles.commentsList}>
                {comments.map((comment) => (
                  <div key={comment.id} className={styles.comment}>
                    <div className={styles.commentTime}>
                      {comment.time}
                    </div>
                    <div className={styles.commentUser}>
                      {comment.user}:
                    </div>
                    <div className={styles.commentText}>
                      {comment.type === 'voice' ? (
                        <audio controls src={comment.audioUrl} className={styles.voiceComment} />
                      ) : (
                        comment.text
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 숨겨진 오디오 엘리먼트 */}
          <audio ref={audioRef} style={{ display: 'none' }} />
        </div>
      </>
    );
  }

  // 로그인 화면
  if (showLogin) {
    return (
      <>
        <Header />
        <div className={styles.loginModal}>
          <div className={styles.loginTerminal}>
            <div className={styles.loginTitle}>MUSIC ACCESS TERMINAL</div>
            <div className={styles.loginSubtitle}>ENTER USER CREDENTIALS</div>
            <input
              ref={loginInputRef}
              type="text"
              className={styles.loginInput}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="USERNAME"
              maxLength={20}
              autoFocus
            />
            <button className={styles.loginBtn} onClick={handleLogin}>
              INITIALIZE CONNECTION
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.projectContainer}>
        {/* User Info */}
        <div className={styles.userInfo}>
          USER: <span>{currentUser.username}</span>
          <span className={styles.userRole}>[{currentUser.role}]</span>
        </div>

        {/* Main Container - project.html 스타일 */}
        <div className={styles.mainContainer}>
          <div className={styles.projectHeader}>
            <h1>VVCKD MUSIC ROOMS <span className={styles.cursor}>▌</span></h1>
            <div className={styles.projectSubtitle}>ENHANCED COLLABORATIVE MUSIC WORKSPACE</div>
          </div>

          <div className={styles.addProjectSection}>
            <h3 style={{ color: '#ff6600', marginBottom: '20px' }}>CREATE MUSIC ROOM</h3>
            <button className={styles.addBtn} onClick={createMusicRoom}>
              + CREATE ROOM
            </button>
          </div>

          {/* Music Rooms Grid */}
          <div className={styles.projectGrid}>
            {musicRooms.map((room) => (
              <div key={room.id} className={styles.projectCard}>
                <div className={styles.projectTitle}>
                  {room.name}
                  <span className={`${styles.projectStatus} ${styles[`status-${room.status}`]}`}>
                    {room.status.toUpperCase()}
                  </span>
                </div>
                
                <div className={styles.projectInfo}>
                  <span className={styles.projectParticipants}>
                    👥 {room.participants} users
                  </span>
                  <span className={styles.projectMusicCount}>
                    🎵 {room.musicCount} tracks
                  </span>
                </div>
                
                <div className={styles.projectDescription}>
                  {room.description}
                </div>
                
                <div className={styles.projectTech}>
                  <span className={styles.techTag}>AUDIO</span>
                  <span className={styles.techTag}>COLLABORATION</span>
                  <span className={styles.techTag}>REAL-TIME</span>
                  <span className={styles.techTag}>VOICE MEMO</span>
                </div>
                
                <div className={styles.projectLinks}>
                  <button
                    className={`${styles.projectBtn} ${styles.join}`}
                    onClick={() => joinMusicRoom(room.id)}
                  >
                    JOIN ROOM
                  </button>
                  <button
                    className={styles.projectBtn}
                    onClick={() => {
                      alert(`Room: ${room.name}\nDescription: ${room.description}\nParticipants: ${room.participants}/${room.maxUsers}\nTracks: ${room.musicCount}`);
                    }}
                  >
                    VIEW INFO
                  </button>
                </div>
              </div>
            ))}
            
            {musicRooms.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🎵</div>
                <div className={styles.emptyTitle}>
                  {socket?.connected ? 'No Music Rooms Found' : 'Connecting...'}
                </div>
                <div className={styles.emptyDescription}>
                  {socket?.connected 
                    ? 'Create the first music room to get started!' 
                    : 'Establishing connection to VLYNK server...'}
                </div>
                {socket?.connected && (
                  <button className={styles.createFirstBtn} onClick={createMusicRoom}>
                    CREATE FIRST ROOM
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}