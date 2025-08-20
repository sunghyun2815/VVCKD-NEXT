'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
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
  createdAt: string;
  updatedAt: string;
}

interface AudioFile {
  id: string;
  name: string;
  filename: string;
  url: string;
  size: number;
  uploader: string;
  uploadedAt: string;
  roomId: string;
}

interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  audioTimestamp?: number;
  time: string;
  audioUrl?: string;
}

export default function ProjectPage() {
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUser, setCurrentUser] = useState('');
  const [musicRooms, setMusicRooms] = useState<MusicRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<MusicRoom | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showLogin, setShowLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  
  // Audio related states
  const [currentTrack, setCurrentTrack] = useState<AudioFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);

  // Socket 초기화
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    // Socket 이벤트 리스너들
    newSocket.on('music_room_list', (rooms: MusicRoom[]) => {
      setMusicRooms(rooms);
    });

    newSocket.on('music_room_join_success', (data: any) => {
      setCurrentRoom(data.room);
      setIsInRoom(true);
      setAudioFiles([]);
      setComments([]);
    });

    newSocket.on('music_room_join_error', (data: any) => {
      alert(data.message);
    });

    newSocket.on('audio_file_uploaded', (file: AudioFile) => {
      setAudioFiles(prev => [...prev, file]);
    });

    newSocket.on('music_chat_message', (message: Comment) => {
      setComments(prev => [...prev, message]);
    });

    newSocket.on('music_voice_message', (voiceMessage: Comment) => {
      setComments(prev => [...prev, voiceMessage]);
    });

    newSocket.on('music_room_updated', (room: MusicRoom) => {
      setMusicRooms(prev => prev.map(r => r.id === room.id ? room : r));
      if (currentRoom && currentRoom.id === room.id) {
        setCurrentRoom(room);
      }
    });

    return () => {
      newSocket.close();
    };
  }, [currentRoom]);

  // Audio 이벤트 리스너
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentTrack]);

  const handleLogin = () => {
    if (username.trim() && socket) {
      setCurrentUser(username.trim());
      setShowLogin(false);
      socket.emit('user_join', { username: username.trim() });
      loadMusicRooms();
    }
  };

  const loadMusicRooms = () => {
    if (socket) {
      socket.emit('get_music_room_list');
    }
  };

  const createMusicRoom = () => {
    const name = prompt('Enter room name:');
    const description = prompt('Enter room description:');
    const maxUsers = prompt('Maximum users (default: 10):');

    if (name && socket) {
      socket.emit('create_music_room', {
        name: name.trim(),
        description: description?.trim() || 'Music collaboration room',
        maxUsers: maxUsers ? parseInt(maxUsers) : 10,
        status: 'active'
      });
    }
  };

  const joinMusicRoom = (roomId: string) => {
    if (socket && currentUser) {
      socket.emit('join_music_room', { roomId });
    }
  };

  const leaveMusicRoom = () => {
    if (socket && currentRoom) {
      socket.emit('leave_music_room', { roomId: currentRoom.id });
      setIsInRoom(false);
      setCurrentRoom(null);
      setAudioFiles([]);
      setComments([]);
      setCurrentTrack(null);
      setIsPlaying(false);
      loadMusicRooms();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && socket && currentRoom) {
      const reader = new FileReader();
      reader.onload = (event) => {
        socket.emit('upload_audio_file', {
          file: event.target?.result,
          fileName: file.name,
          roomId: currentRoom.id
        });
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const playTrack = (track: AudioFile) => {
    if (audioRef.current) {
      setCurrentTrack(track);
      audioRef.current.src = track.url;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current && currentTrack) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const sendComment = () => {
    if (!commentInput.trim() || !socket || !currentRoom) return;

    const comment = {
      user: currentUser,
      text: commentInput.trim(),
      timestamp: Date.now(),
      audioTimestamp: currentTime,
      roomId: currentRoom.id
    };

    socket.emit('music_chat_message', comment);
    setCommentInput('');
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        sendVoiceMessage(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Voice recording error:', error);
      alert('음성 녹음을 시작할 수 없습니다.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const sendVoiceMessage = (audioBlob: Blob) => {
    if (!socket || !currentRoom) return;

    const reader = new FileReader();
    reader.onload = () => {
      const voiceMessage = {
        user: currentUser,
        text: '[음성 메시지]',
        timestamp: Date.now(),
        audioTimestamp: currentTime,
        audioData: reader.result,
        roomId: currentRoom.id
      };

      socket.emit('music_voice_message', voiceMessage);
    };
    reader.readAsDataURL(audioBlob);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showLogin) {
    return (
      <>
        <Header />
        <div className={styles.loginModal}>
          <div className={styles.loginTerminal}>
            <div className={styles.loginTitle}>VLYNK MUSIC ACCESS</div>
            <div className={styles.loginSubtitle}>ENTER USERNAME</div>
            <input
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
              ENTER MUSIC
            </button>
          </div>
        </div>
      </>
    );
  }

  if (isInRoom && currentRoom) {
    return (
      <>
        <Header />
        <div className={styles.musicRoom}>
          <div className={styles.musicRoomHeader}>
            <div className={styles.roomTitle}>{currentRoom.name}</div>
            <button className={styles.leaveBtn} onClick={leaveMusicRoom}>
              LEAVE ROOM
            </button>
          </div>

          <div className={styles.musicContent}>
            {/* Track Info & Controls */}
            <div className={styles.trackHeader}>
              <div className={styles.trackInfo}>
                <div className={styles.currentTrackTitle}>
                  {currentTrack ? currentTrack.name : 'No track selected'}
                </div>
                <div className={styles.currentTrackUploader}>
                  {currentTrack ? `by ${currentTrack.uploader}` : ''}
                </div>
              </div>
              
              <div className={styles.simpleControls}>
                <button
                  className={styles.playBtnMain}
                  onClick={togglePlayPause}
                  disabled={!currentTrack}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  className={styles.uploadBtnMain}
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 UPLOAD
                </button>
              </div>

              <div className={styles.timeDisplay}>
                <span className={styles.currentTimeSpan}>
                  {formatTime(currentTime)}
                </span>
                <span> / </span>
                <span className={styles.totalTimeSpan}>
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Waveform & Progress */}
            <div className={styles.waveformContainer}>
              <canvas
                ref={waveformCanvasRef}
                className={styles.waveformCanvas}
                width="800"
                height="100"
              />
              <div
                className={styles.waveformProgress}
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              <div
                className={styles.playhead}
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
            </div>

            {/* Audio Files List */}
            <div className={styles.audioFilesList}>
              <h3>TRACKS ({audioFiles.length})</h3>
              <div className={styles.fileGrid}>
                {audioFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`${styles.audioFileItem} ${
                      currentTrack?.id === file.id ? styles.active : ''
                    }`}
                    onClick={() => playTrack(file)}
                  >
                    <div className={styles.fileName}>{file.name}</div>
                    <div className={styles.fileInfo}>
                      by {file.uploader} • {(file.size / 1024 / 1024).toFixed(2)}MB
                    </div>
                    <div className={styles.playIcon}>
                      {currentTrack?.id === file.id && isPlaying ? '⏸' : '▶'}
                    </div>
                  </div>
                ))}
                
                {audioFiles.length === 0 && (
                  <div className={styles.emptyState}>
                    No audio files uploaded yet. Upload your first track!
                  </div>
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div className={styles.commentsSection}>
              <h3>COMMENTS ({comments.length})</h3>
              
              <div className={styles.commentInputArea}>
                <input
                  type="text"
                  className={styles.commentInput}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendComment()}
                  placeholder={`Comment at ${formatTime(currentTime)}`}
                />
                
                <button
                  className={`${styles.voiceBtn} ${isRecording ? styles.recording : ''}`}
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                >
                  🎤 {isRecording ? 'STOP' : 'VOICE'}
                </button>
                
                <button className={styles.sendBtn} onClick={sendComment}>
                  SEND
                </button>
              </div>

              <div className={styles.commentsList}>
                {comments.map((comment) => (
                  <div key={comment.id} className={styles.commentItem}>
                    <div className={styles.commentHeader}>
                      <span className={styles.commentUser}>{comment.user}</span>
                      {comment.audioTimestamp !== undefined && (
                        <span
                          className={styles.commentTimeIndicator}
                          onClick={() => seekTo(comment.audioTimestamp!)}
                        >
                          @{formatTime(comment.audioTimestamp)}
                        </span>
                      )}
                      <span className={styles.commentTime}>{comment.time}</span>
                    </div>
                    
                    <div className={styles.commentText}>{comment.text}</div>
                    
                    {comment.audioUrl && (
                      <audio controls className={styles.voicePlayback}>
                        <source src={comment.audioUrl} type="audio/wav" />
                      </audio>
                    )}
                  </div>
                ))}
                
                {comments.length === 0 && (
                  <div className={styles.emptyState}>
                    No comments yet. Start the conversation!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hidden Audio Element */}
          <audio ref={audioRef} />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.projectContainer}>
        <div className={styles.userInfo}>
          USER: <span>{currentUser}</span>
        </div>

        <div className={styles.addProjectSection}>
          <button className={styles.addBtn} onClick={createMusicRoom}>
            + CREATE MUSIC ROOM
          </button>
        </div>

        <div className={styles.mainContainer}>
          <div className={styles.projectHeader}>
            <h1>VLYNK MUSIC ROOMS <span className={styles.cursor}>▌</span></h1>
            <div className={styles.projectSubtitle}>
              ENHANCED COLLABORATIVE MUSIC WORKSPACE
            </div>
          </div>

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
                    👥 {room.participants}/{room.maxUsers} users
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
                    onClick={() => alert(`Room: ${room.name}\nDescription: ${room.description}\nParticipants: ${room.participants}/${room.maxUsers}\nTracks: ${room.musicCount}`)}
                  >
                    VIEW INFO
                  </button>
                </div>
              </div>
            ))}
            
            {musicRooms.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🎵</div>
                <div className={styles.emptyTitle}>No Music Rooms Available</div>
                <div className={styles.emptyDescription}>
                  Create your first music room to start collaborating!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}