'use client';

import { useState, useEffect, useRef } from 'react';
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
  description?: string;
  status?: string;
}

interface User {
  id: string;
  username: string;
  role: string;
}

interface Track {
  filename: string;
  originalName: string;
  url: string;
  uploader: string;
}

interface Comment {
  id: string;
  user: string;
  message: string;
  timestamp: number;
  time: string;
  type?: 'voice' | 'text';
}

export default function ProjectPage() {
  // ===== 기존 상태 변수들 (그대로 유지) =====
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [connectedUsers, setConnectedUsers] = useState<number>(0);
  
  const [currentUser, setCurrentUser] = useState<User>({ id: 'GUEST', username: 'GUEST', role: 'MEMBER' });
  const [username, setUsername] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  
  const [musicRooms, setMusicRooms] = useState<MusicRoom[]>([]);
  const [currentMusicRoom, setCurrentMusicRoom] = useState<MusicRoom | null>(null);
  const [showMusicRoom, setShowMusicRoom] = useState(false);
  
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [commentTime, setCommentTime] = useState(0);
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  // ===== 기존 refs (그대로 유지) =====
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformData = useRef<number[]>([]);

  // ===== Socket 연결 부분만 수정 =====
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

    // 음악 업로드 이벤트 (기존 이벤트명 유지)
    newSocket.on('music uploaded', (data) => {
      console.log('🎵 Music uploaded:', data.track);
      setCurrentTrack(data.track);
      loadAudioTrack(data.track.url);
      
      const systemComment: Comment = {
        id: `system_${Date.now()}`,
        user: 'SYSTEM',
        message: `🎵 ${data.uploader}님이 "${data.track.originalName}"을 업로드했습니다.`,
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
          audioRef.current.play();
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

  // ===== 기존 오디오 트랙 로드 함수 (그대로 유지) =====
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

  // ===== 기존 웨이브폼 생성 함수 (그대로 유지) =====
  const generateWaveform = async () => {
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
  };

  // ===== 기존 웨이브폼 그리기 함수 (그대로 유지) =====
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
  };

  // ===== 수정된 함수들 =====
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

  // ===== 기존 플레이어 제어 함수 (수정) =====
  const togglePlayback = () => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }

    // 서버에 동기화 알림 (기존 이벤트명 유지)
    if (socket && currentMusicRoom) {
      socket.emit('toggle playback', {
        roomId: currentMusicRoom.id
      });
    }
  };

  // ===== 기존 파일 업로드 함수 (수정) =====
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    const formData = new FormData();
    formData.append('music', file);
    
    fetch('/api/upload/music', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.success && socket) {
        // 기존 이벤트명 유지
        socket.emit('music uploaded', {
          roomId: currentMusicRoom.id,
          musicData: {
            originalname: data.file.originalName,
            filename: data.file.filename,
            url: data.file.url
          }
        });
      }
    })
    .catch(error => {
      console.error('Upload error:', error);
      alert('Upload failed');
    });
  };

  // ===== 기존 댓글 추가 함수 (수정) =====
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

  // ===== 기존 음성 녹음 함수 (수정) =====
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

  // ===== 기존 유틸리티 함수들 (그대로 유지) =====
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

  // ===== 기존 렌더링 부분 (그대로 유지) =====

  // 로그인 화면
  if (showLogin) {
    return (
      <div className={styles.projectContainer}>
        <Header />
        
        <div className={styles.userInfo}>
          USER: <span>{currentUser.username}</span>
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
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={styles.uploadBtnMain}
              >
                📎 UPLOAD MUSIC
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
                className={`${styles.commentBtn} ${styles.voice}`}
                style={{ 
                  backgroundColor: isRecording ? '#ff0000' : 'transparent',
                  color: isRecording ? '#fff' : '#ffff00'
                }}
              >
                🎤 {isRecording ? 'STOP' : 'VOICE'}
              </button>
              <button
                onClick={addComment}
                disabled={!newComment.trim()}
                className={`${styles.commentBtn} ${styles.send}`}
              >
                SEND
              </button>
            </div>

            {/* 댓글 목록 */}
            <div className={styles.commentsList}>
              {comments.map((comment, index) => (
                <div key={comment.id || index} className={styles.comment}>
                  <strong style={{ color: comment.user === 'SYSTEM' ? '#ffff00' : '#ff6600' }}>
                    {comment.user}
                  </strong>
                  <span style={{ color: '#666', fontSize: '7px', marginLeft: '10px' }}>
                    [{formatTime(comment.timestamp)}]
                  </span>
                  <div style={{ marginTop: '5px', fontSize: '8px' }}>
                    {comment.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 오디오 엘리먼트 */}
        {currentTrack && (
          <audio ref={audioRef} style={{ display: 'none' }} />
        )}

        {/* 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          accept="audio/*"
        />
      </div>
    );
  }

  // 메인 프로젝트 리스트 (기존 UI 그대로)
  return (
    <div className={styles.projectContainer}>
      <Header />
      
      <div className={styles.userInfo}>
        USER: <span>{currentUser.username}</span>
        <span className={styles.userRole}>[{currentUser.role}]</span>
      </div>

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

        <div className={styles.projectGrid}>
          {musicRooms.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              gridColumn: '1 / -1', 
              padding: '50px',
              color: '#666' 
            }}>
              <div style={{ fontSize: '32px', marginBottom: '20px' }}>🎵</div>
              <div>음악 룸이 없습니다. 첫 번째 룸을 만들어보세요!</div>
            </div>
          ) : (
            musicRooms.map((room) => (
              <div key={room.id} className={styles.projectCard}>
                <div className={styles.projectTitle}>
                  {room.name}
                  <span className={styles.projectStatus}>
                    {room.status?.toUpperCase() || 'ACTIVE'}
                  </span>
                </div>
                
                <div className={styles.projectInfo}>
                  <div className={styles.projectParticipants}>
                    👥 {room.userCount}/{room.maxUsers}
                  </div>
                  <div className={styles.projectMusicCount}>
                    🎵 Music Room
                  </div>
                </div>
                
                <div className={styles.projectDescription}>
                  {room.description || '음악 협업을 위한 룸입니다.'}
                </div>
                
                <div className={styles.projectLinks}>
                  <button
                    onClick={() => {
                      const password = room.hasPassword ? 
                        prompt('비밀번호를 입력하세요:') : '';
                      if (room.hasPassword && !password) return;
                      joinMusicRoom(room.id, password || '');
                    }}
                    className={`${styles.projectBtn} ${styles.join}`}
                  >
                    JOIN ROOM
                  </button>
                  <button className={styles.projectBtn}>
                    BY {room.creator}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}