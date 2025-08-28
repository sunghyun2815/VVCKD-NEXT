'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/app/components/Header';
import { io, Socket } from 'socket.io-client';
import WaveformCanvas from './components/WaveformCanvas';
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
  file?: File;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== 유틸리티 함수들 =====
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

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

    // 트랙 업로드 성공
    newSocket.on('music uploaded', (data) => {
      console.log('🎵 Track uploaded:', data);
      // 이미 로컬에서 트랙을 설정했으므로 추가 작업 없음
    });

    // 댓글 이벤트
    newSocket.on('music chat message', (messageData) => {
      console.log('💬 New chat message:', messageData);
      if (messageData.roomId === currentMusicRoom?.id) {
        const comment: Comment = {
          id: messageData.id || Date.now().toString(),
          user: messageData.username,
          message: messageData.message,
          timestamp: messageData.timestamp || 0,
          time: messageData.time || new Date().toLocaleTimeString(),
          type: 'text'
        };
        setComments(prev => [...prev, comment]);
      }
    });

    // 정리
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // ===== 오디오 이벤트 핸들러들 =====
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setCommentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setTotalTime(audio.duration);
      }
    };

    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    const handleError = (e: Event) => {
      console.error('❌ Audio error:', e);
      if (audio.error) {
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
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  // ===== 핸들러 함수들 =====
  const handleLogin = () => {
    if (!username.trim() || !socket) return;
    
    console.log('👤 Attempting login with username:', username);
    socket.emit('user:login', { 
      username: username.trim(), 
      namespace: 'project' 
    });
  };

  const createMusicRoom = () => {
    if (!socket) return;
    
    const roomName = prompt('음악방 이름을 입력해주세요:');
    if (!roomName) return;
    
    socket.emit('room:create', {
      name: roomName,
      description: '새로운 음악 작업 공간입니다.',
      maxUsers: 10,
      hasPassword: false
    });
  };

  const joinMusicRoom = (roomId: string) => {
    if (!socket) return;
    
    console.log('🎵 Joining music room:', roomId);
    socket.emit('room:join', { roomId });
  };

  const leaveMusicRoom = () => {
    if (!socket || !currentMusicRoom) return;
    
    console.log('🎵 Leaving music room');
    socket.emit('room:leave');
    setShowMusicRoom(false);
    setCurrentMusicRoom(null);
    setCurrentTrack(null);
    setComments([]);
    setIsPlaying(false);
    setCurrentTime(0);
    setTotalTime(0);
  };

  const togglePlayback = async () => {
    if (!audioRef.current || !currentTrack) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('재생 오류:', error);
      alert('재생 중 오류가 발생했습니다.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket || !currentMusicRoom) return;

    if (!file.type.startsWith('audio/')) {
      alert('오디오 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('파일 크기는 50MB를 초과할 수 없습니다.');
      return;
    }

    try {
      console.log('🎵 Uploading file:', file.name);
      
      // 트랙 정보 생성
      const track: Track = {
        originalName: file.name,
        filename: file.name,
        url: URL.createObjectURL(file),
        uploader: currentUser.username,
        uploadedAt: new Date().toISOString(),
        file: file
      };

      // 오디오 엘리먼트에 파일 로드
      if (audioRef.current) {
        audioRef.current.src = track.url;
      }

      setCurrentTrack(track);
      
      // 서버에 알림 (실제 파일 업로드는 생략)
      socket.emit('music uploaded', {
        roomId: currentMusicRoom.id,
        musicData: {
          originalname: track.originalName,
          filename: track.filename,
          url: track.url
        }
      });

    } catch (error) {
      console.error('파일 업로드 오류:', error);
      alert('파일 업로드 중 오류가 발생했습니다.');
    }

    // 파일 입력 초기화
    e.target.value = '';
  };

  const sendComment = () => {
    if (!newComment.trim() || !socket || !currentMusicRoom) return;

    const comment = {
      id: Date.now().toString(),
      user: currentUser.username,
      message: newComment.trim(),
      timestamp: commentTime,
      time: new Date().toLocaleTimeString(),
      type: 'text' as const
    };

    socket.emit('music chat message', {
      roomId: currentMusicRoom.id,
      username: currentUser.username,
      message: comment.message,
      timestamp: comment.timestamp,
      time: comment.time
    });

    setNewComment('');
  };

  const handleCommentKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendComment();
    }
  };

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
          
          {/* 파일 입력 (숨김) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className={styles.hiddenFileInput}
          />

          {/* 트랙 헤더 */}
          <div className={styles.trackHeaderSimple}>
            <div className={styles.trackInfoLeft}>
              <div className={styles.trackTitleSimple}>
                {currentTrack ? currentTrack.originalName : 'No track selected'}
              </div>
              <div className={styles.trackUploaderSimple}>
                {currentTrack ? `Uploaded by ${currentTrack.uploader}` : 'Upload a track to get started'}
              </div>
            </div>
            <div className={styles.trackActions}>
              <button 
                className={styles.downloadBtn} 
                disabled={!currentTrack}
              >
                💾 DOWNLOAD
              </button>
            </div>
          </div>

          {/* 웨이브폼 영역 */}
          <div className={styles.waveformMainArea}>
            <div className={styles.waveformContainerMain}>
              <WaveformCanvas
                audioFile={currentTrack?.file || null}
                isPlaying={isPlaying}
                currentTime={currentTime}
                totalTime={totalTime}
                onSeek={handleSeek}
                className={styles.waveformCanvasMain}
              />
              
              {!currentTrack && (
                <div className={styles.waveformLoadingMain}>
                  🎵 Upload a track to see waveform<br/>
                  Drag and drop or click upload button
                </div>
              )}
            </div>

            {/* 시간 표시 */}
            <div className={styles.timeDisplay}>
              <span className={styles.timeCurrent}>{formatTime(currentTime)}</span>
              <span className={styles.timeSeparator}>/</span>
              <span className={styles.timeTotal}>{formatTime(totalTime)}</span>
            </div>

            {/* 컨트롤 버튼들 */}
            <div className={styles.simpleControls}>
              <button 
                onClick={togglePlayback}
                disabled={!currentTrack}
                className={styles.playBtnMain}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
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
                onKeyPress={handleCommentKeyPress}
                placeholder="Add your comment here, mention users with @"
                className={styles.commentInput}
              />
              <button 
                className={`${styles.commentBtn} ${styles.voice}`}
                disabled
              >
                🎤 VOICE
              </button>
              <button 
                onClick={sendComment}
                className={`${styles.commentBtn} ${styles.send}`}
              >
                SEND
              </button>
            </div>
            
            <div className={styles.commentsList}>
              {comments.map((comment) => (
                <div 
                  key={comment.id} 
                  className={`${styles.comment} ${comment.type === 'voice' ? styles.voiceComment : ''}`}
                >
                  <div className={styles.commentHeader}>
                    <span className={styles.commentUser}>[{formatTime(comment.timestamp)}] {comment.user}</span>
                    <span className={styles.commentTime}>{comment.time}</span>
                  </div>
                  <div className={styles.commentContent}>
                    {comment.type === 'voice' ? '🎤 Voice Message' : comment.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 메인 화면 (룸 리스트)
  return (
    <div className={styles.projectContainer}>
      <Header />
      
      <div className={styles.userInfo}>
        USER: <span>{currentUser.username}</span>
        <span className={styles.userRole}>[{currentUser.role}]</span>
        <span style={{ marginLeft: '20px', color: '#666' }}>
          {connectionStatus} | Users: {connectedUsers}
        </span>
      </div>

      <div className={styles.mainContainer}>
        <div className={styles.projectHeader}>
          <h1>VLYNK MUSIC STUDIO</h1>
          <div className={styles.projectSubtitle}>
            Collaborative Music Creation Platform<span className={styles.cursor}>_</span>
          </div>
        </div>

        <div className={styles.addProjectSection}>
          <button onClick={createMusicRoom} className={styles.addBtn}>
            ＋ CREATE NEW MUSIC ROOM
          </button>
        </div>

        <div className={styles.projectGrid}>
          {musicRooms.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎵</div>
              <div className={styles.emptyTitle}>No Music Rooms Available</div>
              <div className={styles.emptyDescription}>
                Create the first music room to start collaborating with others.
              </div>
            </div>
          ) : (
            musicRooms.map((room) => (
              <div key={room.id} className={styles.projectCard}>
                <div className={styles.roomName}>
                  {room.name}
                </div>
                <div className={styles.roomStatus}>
                  <span className={room.status === 'active' ? styles.active : styles.inactive}>
                    ●
                  </span>
                  {room.status.toUpperCase()}
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
                <div className={styles.projectLinks}>
                  <button
                    onClick={() => joinMusicRoom(room.id)}
                    className={`${styles.projectBtn} ${styles.join}`}
                  >
                    JOIN ROOM
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