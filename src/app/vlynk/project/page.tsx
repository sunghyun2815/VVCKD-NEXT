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
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) {
      return '00:00';
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = useCallback((time: number) => {
    if (!audioRef.current || !currentTrack) return;
    
    const audio = audioRef.current;
    
    // 시간 값 검증
    if (isNaN(time) || time < 0) {
      console.warn('⚠️ Invalid seek time:', time);
      return;
    }
    
    // duration 체크
    if (!audio.duration || isNaN(audio.duration) || audio.duration <= 0) {
      console.warn('⚠️ Cannot seek: invalid duration');
      return;
    }
    
    // 최대 시간 제한
    const seekTime = Math.min(time, audio.duration - 0.1);
    
    console.log('🎵 Seeking to:', seekTime);
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  }, [currentTrack]);

  // ===== Socket 연결 및 이벤트 핸들러 =====
  useEffect(() => {
    const newSocket = io('http://localhost:3001/project', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    newSocket.on('connect', () => {
      console.log('🔌 Project Socket connected:', newSocket.id);
      setSocket(newSocket);
      setConnectionStatus('연결됨');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Project Socket disconnected:', reason);
      setConnectionStatus('연결 끊어짐');
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔌 Project Socket connection error:', error);
      setConnectionStatus('연결 실패');
    });

    // 사용자 로그인 응답 - 서버와 동일한 이벤트명 사용
    newSocket.on('user:login_success', (data) => {
      console.log('👤 Login successful:', data);
      setCurrentUser(data.user);
      setConnectedUsers(data.connectedUsers);
      setShowLogin(false);
    });

    newSocket.on('user:login_error', (error) => {
      console.error('👤 Login failed:', error);
      alert('로그인 실패: ' + error.message);
    });

    // 연결된 사용자 수 업데이트 - 이미 login_success에서 받으므로 제거하거나 별도 처리
    // newSocket.on('users:count', (count) => {
    //   setConnectedUsers(count);
    // });

    // 음악방 목록 업데이트 - 서버와 동일한 이벤트명 사용  
    newSocket.on('rooms:list', (rooms) => {
      console.log('🎵 Music rooms received:', rooms);
      // 중복 제거를 위해 Map 사용
      const uniqueRooms = rooms.reduce((acc: MusicRoom[], room: MusicRoom) => {
        const existing = acc.find(r => r.id === room.id);
        if (!existing) {
          acc.push(room);
        }
        return acc;
      }, []);
      setMusicRooms(uniqueRooms);
    });

    // 음악방 생성 성공 - 서버와 동일한 이벤트명 사용
    newSocket.on('room:created', (data) => {
      console.log('🎵 Room created:', data.room);
      // 중복 방지: 이미 존재하는 룸인지 확인 후 추가
      setMusicRooms(prev => {
        const existingRoom = prev.find(room => room.id === data.room.id);
        if (existingRoom) {
          console.log('🔄 Room already exists, updating...');
          return prev.map(room => 
            room.id === data.room.id ? data.room : room
          );
        } else {
          console.log('➕ Adding new room...');
          return [...prev, data.room];
        }
      });
    });

    // 음악방 입장 성공 - 서버와 동일한 이벤트명 사용
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

    // 댓글 이벤트 - 중복 방지 로직 추가
    newSocket.on('music chat message', (messageData) => {
      console.log('💬 New chat message received:', messageData);
      
      const comment: Comment = {
        id: messageData.id || Date.now().toString(),
        user: messageData.user || messageData.username,
        message: messageData.message,
        timestamp: messageData.timestamp || 0,
        time: messageData.time || new Date().toLocaleTimeString(),
        type: messageData.type || 'text'
      };
      
      console.log('📝 Adding comment to UI:', comment);
      setComments(prev => {
        // 임시 댓글(낙관적 업데이트) 제거
        const withoutTemp = prev.filter(existing => !existing.id.startsWith('temp_'));
        
        // 중복 확인: 같은 메시지와 사용자, 타임스탬프가 있는지 체크
        const isDuplicate = withoutTemp.some(existing => 
          existing.message === comment.message && 
          existing.user === comment.user &&
          Math.abs(existing.timestamp - comment.timestamp) < 1 // 1초 이내 같은 메시지는 중복으로 간주
        );
        
        if (isDuplicate) {
          console.log('🔄 Duplicate comment detected, skipping...');
          return withoutTemp;
        }
        
        const updated = [...withoutTemp, comment];
        console.log('📋 Updated comments list:', updated.length);
        return updated;
      });
    });

    // 정리
    return () => {
      newSocket.disconnect();
    };
  }, []); // currentMusicRoom?.id 제거

  // ===== 수정된 오디오 이벤트 핸들러들 =====
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isNaN(audio.currentTime)) {
        const newTime = audio.currentTime;
        console.log('⏰ Time update:', newTime, '/', audio.duration);
        setCurrentTime(newTime);
        setCommentTime(newTime);
      } else {
        console.warn('⚠️ Invalid currentTime:', audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      console.log('🎵 Metadata loaded - Duration:', audio.duration);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setTotalTime(audio.duration);
        console.log('✅ Total time set:', audio.duration);
      } else {
        console.warn('⚠️ Invalid duration:', audio.duration);
        // 재시도 로직
        setTimeout(() => {
          if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
            setTotalTime(audio.duration);
            console.log('🔄 Retry - Total time set:', audio.duration);
          }
        }, 100);
      }
    };

    const handleLoadedData = () => {
      console.log('🎵 Audio data loaded');
      // loadedmetadata가 안 될 경우 대안
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setTotalTime(audio.duration);
        console.log('📊 Duration from loadeddata:', audio.duration);
      }
    };

    const handleCanPlay = () => {
      console.log('🎵 Can play - Duration:', audio.duration);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setTotalTime(audio.duration);
      }
    };

    const handleEnded = () => {
      console.log('🎵 Audio ended');
      setIsPlaying(false);
    };
    
    const handlePause = () => {
      console.log('🎵 Audio paused');
      setIsPlaying(false);
    };
    
    const handlePlay = () => {
      console.log('🎵 Audio playing');
      setIsPlaying(true);
    };

    const handleError = (e: Event) => {
      console.error('❌ Audio error:', e);
      setIsPlaying(false);
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

    const handleWaiting = () => {
      console.log('🎵 Audio waiting/buffering');
    };

    // 모든 이벤트 리스너 등록
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
    };
  }, [currentTrack]); // currentTrack 의존성 추가

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

  // ===== 수정된 재생/일시정지 토글 함수 =====
  const togglePlayback = async () => {
    if (!audioRef.current || !currentTrack) {
      console.warn('⚠️ No audio or track available');
      return;
    }

    const audio = audioRef.current;
    
    try {
      console.log('🎵 Toggle playback - Current state:', { isPlaying, paused: audio.paused, readyState: audio.readyState });
      
      if (isPlaying || !audio.paused) {
        console.log('🎵 Pausing audio');
        audio.pause();
        setIsPlaying(false); // 명시적으로 상태 설정
        // 강제 시간 추적 중단을 위해 상태 업데이트
        console.log('⏸️ Playback paused');
      } else {
        console.log('🎵 Attempting to play audio');
        
        // 메타데이터가 아직 로드되지 않은 경우 재시도
        if (!audio.duration || isNaN(audio.duration) || audio.duration === 0) {
          console.log('🎵 Metadata not ready, reloading...');
          audio.load();
          
          // 메타데이터 로딩 대기
          await new Promise<void>((resolve, reject) => {
            const onLoadedMetadata = () => {
              console.log('🎵 Retry - Metadata loaded:', audio.duration);
              audio.removeEventListener('loadedmetadata', onLoadedMetadata);
              audio.removeEventListener('error', onError);
              resolve();
            };
            
            const onError = () => {
              console.error('🎵 Retry - Load error');
              audio.removeEventListener('loadedmetadata', onLoadedMetadata);
              audio.removeEventListener('error', onError);
              reject(new Error('Audio reload failed'));
            };
            
            audio.addEventListener('loadedmetadata', onLoadedMetadata);
            audio.addEventListener('error', onError);
            
            // 이미 로드된 경우
            if (audio.readyState >= 1 && audio.duration > 0) {
              onLoadedMetadata();
            }
            
            // 2초 타임아웃
            setTimeout(() => {
              audio.removeEventListener('loadedmetadata', onLoadedMetadata);
              audio.removeEventListener('error', onError);
              reject(new Error('Metadata load timeout'));
            }, 2000);
          });
        }
        
        await audio.play();
        setIsPlaying(true); // 명시적으로 상태 설정
        console.log('✅ Audio playing successfully');
        
        // 재생 시작 후 강제 시간 업데이트 시작
        const startTimeTracking = () => {
          if (audioRef.current && !audioRef.current.paused) {
            const current = audioRef.current.currentTime;
            console.log('🔄 Force time update:', current);
            setCurrentTime(current);
            setCommentTime(current);
            setTimeout(startTimeTracking, 100); // 100ms마다 업데이트
          }
        };
        setTimeout(startTimeTracking, 100);
      }
    } catch (error: any) {
      console.error('재생 오류:', error);
      setIsPlaying(false);
      
      // 사용자 친화적 오류 메시지
      if (error.name === 'NotAllowedError') {
        alert('브라우저에서 자동 재생이 차단되었습니다. 다시 클릭해주세요.');
      } else if (error.name === 'NotSupportedError') {
        alert('지원하지 않는 오디오 형식입니다.');
      } else {
        alert('재생 중 오류가 발생했습니다. 파일을 다시 업로드해주세요.');
      }
    }
  };

  // ===== 수정된 파일 업로드 핸들러 =====
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
      
      // 이전 오디오 정리
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load(); // 이전 로드된 내용 초기화
      }

      // 상태 초기화
      setIsPlaying(false);
      setCurrentTime(0);
      setTotalTime(0);
      
      // 트랙 정보 생성
      const track: Track = {
        originalName: file.name,
        filename: file.name,
        url: URL.createObjectURL(file),
        uploader: currentUser.username,
        uploadedAt: new Date().toISOString(),
        file: file
      };

      console.log('🎵 Track created:', track);
      setCurrentTrack(track);

      // 오디오 엘리먼트에 파일 로드
      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.load(); // 명시적으로 로드 호출
        
        // 메타데이터 로딩을 기다리는 Promise
        const loadPromise = new Promise<void>((resolve, reject) => {
          const audio = audioRef.current!;
          
          const onLoadedMetadata = () => {
            console.log('🎵 Promise - Metadata loaded:', audio.duration);
            if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
              setTotalTime(audio.duration);
            }
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = () => {
            console.error('🎵 Promise - Load error');
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('error', onError);
            reject(new Error('Audio load failed'));
          };
          
          audio.addEventListener('loadedmetadata', onLoadedMetadata);
          audio.addEventListener('error', onError);
          
          // 이미 메타데이터가 로드된 경우
          if (audio.readyState >= 1) {
            onLoadedMetadata();
          }
        });

        // 최대 3초 대기
        try {
          await Promise.race([
            loadPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 3000)
            )
          ]);
          console.log('✅ Audio metadata loaded successfully');
          
          // 메타데이터 로딩 후 강제로 시간 업데이트 시작
          const testTimeUpdate = () => {
            if (audioRef.current) {
              const audio = audioRef.current;
              console.log('🧪 Test time update:', {
                currentTime: audio.currentTime,
                duration: audio.duration,
                paused: audio.paused,
                readyState: audio.readyState
              });
              setCurrentTime(audio.currentTime);
              if (!audio.paused) {
                setTimeout(testTimeUpdate, 100); // 100ms마다 체크
              }
            }
          };
          
          // timeupdate 이벤트가 작동하지 않을 경우를 위한 폴백
          setTimeout(testTimeUpdate, 100);
          
        } catch (error) {
          console.warn('⚠️ Audio metadata loading timeout or failed:', error);
          // 실패해도 계속 진행 (일부 브라우저에서는 재생 시점에 로드됨)
        }
      }
      
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
      
      // 오류 시 상태 초기화
      setCurrentTrack(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setTotalTime(0);
    }
  };

  const sendComment = () => {
    if (!newComment.trim() || !socket || !currentMusicRoom || !currentUser) return;

    const commentData = {
      roomId: currentMusicRoom.id,
      message: newComment.trim(),
      timestamp: commentTime,
      time: formatTime(commentTime)
    };

    console.log('💬 Sending comment:', commentData);
    
    // 서버에 전송 (낙관적 업데이트 제거)
    socket.emit('music chat message', commentData);
    setNewComment('');
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        // TODO: 음성 메시지 업로드 및 전송 로직
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          setIsRecording(false);
          setMediaRecorder(null);
        }
      }, 30000); // 30초 제한

    } catch (error) {
      console.error('음성 녹음 오류:', error);
      alert('마이크 접근이 거부되었습니다.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showLogin) {
        handleLogin();
      } else {
        sendComment();
      }
    }
  };

  const handleCommentKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendComment();
    }
  };

  // ===== 렌더링 =====

  // 로그인 화면
  if (showLogin) {
    return (
      <div className={styles.container}>
        <Header />
        
        <div className={styles.userInfo}>
          USER: GUEST
          <span className={styles.userRole}>[GUEST]</span>
        </div>

        <div className={styles.loginOverlay}>
          <div className={styles.loginBox}>
            <div className={styles.loginTitle}>MUSIC PROJECT ACCESS</div>
            <div className={styles.loginSubtext}>ENTER USERNAME</div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="USERNAME"
              className={styles.loginInput}
              maxLength={20}
              onKeyPress={handleKeyPress}
              autoFocus
            />
            <button
              onClick={handleLogin}
              disabled={!username.trim()}
              className={styles.loginBtn}
            >
              ENTER STUDIO
            </button>
            <div className={styles.connectionStatus}>
              STATUS: <span className={connectionStatus === '연결됨' ? styles.connected : styles.disconnected}>
                {connectionStatus}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 음악방 화면
  if (showMusicRoom && currentMusicRoom) {
    return (
      <div className={styles.musicRoom}>
        <Header />
        
        {/* 숨겨진 오디오 엘리먼트 */}
        <audio ref={audioRef} preload="metadata" />
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        {/* 음악방 헤더 */}
        <div className={styles.musicRoomHeader}>
          <div className={styles.roomTitle}>
            🎵 {currentMusicRoom.name}
          </div>
          <button onClick={leaveMusicRoom} className={styles.leaveBtn}>
            LEAVE STUDIO
          </button>
        </div>

        {/* 음악방 콘텐츠 */}
        <div className={styles.musicContent}>
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
              {/* 디버깅용 정보 - 개발 완료 후 제거 */}
              <div style={{ fontSize: '6px', color: '#666', marginTop: '5px' }}>
                Debug: isPlaying={isPlaying ? 'true' : 'false'}, 
                hasTrack={currentTrack ? 'yes' : 'no'}, 
                audioSrc={audioRef.current?.src ? 'set' : 'none'},
                comments={comments.length}
              </div>
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
                placeholder="Add your comment here, mention users with @"
                className={styles.commentInput}
                onKeyPress={handleKeyPress}
              />
              <button 
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={`${styles.commentBtn} ${styles.voice} ${isRecording ? styles.recording : ''}`}
              >
                🎤 {isRecording ? 'RECORDING' : 'VOICE'}
              </button>
              <button 
                onClick={sendComment}
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
                    <span 
                      className={styles.commentTimestamp}
                      onClick={() => handleSeek(comment.timestamp)}
                    >
                      [{formatTime(comment.timestamp)}]
                    </span>
                  </div>
                  <div className={styles.commentMessage}>
                    {comment.type === 'voice' ? (
                      <div className={styles.voiceMessage}>
                        🎤 Voice Message
                        {comment.voiceUrl && (
                          <audio controls>
                            <source src={comment.voiceUrl} type="audio/wav" />
                          </audio>
                        )}
                      </div>
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

  // 메인 음악방 목록 화면
  return (
    <div className={styles.container}>
      <Header />
      
      <div className={styles.userInfo}>
        USER: <span>{currentUser.username}</span>
        <span className={styles.userRole}>[{currentUser.role}]</span>
      </div>

      <div className={styles.mainContainer}>
        <div className={styles.header}>
          <h1>VVCKD MUSIC STUDIO <span className={styles.cursor}>▌</span></h1>
          <div className={styles.statusText}>
            Connected Users: {connectedUsers}<br/>
            Status: <span className={connectionStatus === '연결됨' ? styles.connected : styles.disconnected}>
              {connectionStatus}
            </span>
          </div>
        </div>

        <div className={styles.createRoomSection}>
          <button onClick={createMusicRoom} className={styles.createRoomBtn}>
            CREATE MUSIC ROOM
          </button>
        </div>

        <div className={styles.roomsGrid}>
          {musicRooms.length === 0 ? (
            <div className={styles.noRooms}>
              <p>No music rooms available</p>
              <p>Create a room to start collaborating!</p>
            </div>
          ) : (
            // 중복 제거를 위한 추가 필터링
            musicRooms
              .filter((room, index, self) => 
                index === self.findIndex(r => r.id === room.id)
              )
              .map((room) => (
                <div 
                  key={room.id} // 원래대로 room.id 사용 (중복은 위에서 이미 제거)
                  className={styles.roomCard}
                  onClick={() => joinMusicRoom(room.id)}
                >
                  <div className={styles.roomHeader}>
                    <div className={styles.roomName}>🎵 {room.name || 'Unnamed Room'}</div>
                    <div className={styles.roomUsers}>
                      {room.userCount || 0}/{room.maxUsers || 10}
                    </div>
                  </div>
                  <div className={styles.roomDescription}>
                    {room.description || 'No description available'}
                  </div>
                  <div className={styles.roomTech}>
                    {room.tech?.join(' • ') || 'No technologies specified'}
                  </div>
                  <div className={styles.roomStatus}>
                    <span className={room.status === 'active' ? styles.active : styles.inactive}>
                      {room.status ? room.status.toUpperCase() : 'UNKNOWN'}
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}