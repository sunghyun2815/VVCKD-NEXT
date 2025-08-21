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
  createdAt: string;
  updatedAt: string;
}

export default function ProjectPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUser, setCurrentUser] = useState('');
  const [musicRooms, setMusicRooms] = useState<MusicRoom[]>([]);
  const [showLogin, setShowLogin] = useState(true);
  const [username, setUsername] = useState('');

  // Socket 초기화
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    // 올바른 이벤트 이름 사용
    newSocket.on('music_room_list', (rooms: MusicRoom[]) => {
      console.log('받은 룸 목록:', rooms);
      setMusicRooms(rooms);
    });

    newSocket.on('music_room_created', (room: MusicRoom) => {
      console.log('새 룸 생성됨:', room);
      loadMusicRooms(); // 룸 목록 새로고침
    });

    newSocket.on('music_room_updated', (room: MusicRoom) => {
      console.log('룸 업데이트됨:', room);
      setMusicRooms(prev => prev.map(r => r.id === room.id ? room : r));
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleLogin = () => {
    if (username.trim() && socket) {
      setCurrentUser(username.trim());
      setShowLogin(false);
      // 올바른 이벤트 이름 사용
      socket.emit('user_join', { username: username.trim() });
      setTimeout(() => loadMusicRooms(), 1000); // 1초 후 룸 목록 로드
    }
  };

  const loadMusicRooms = () => {
    if (socket) {
      console.log('룸 목록 요청 중...');
      // 올바른 이벤트 이름 사용
      socket.emit('get_music_room_list');
    }
  };

  const createMusicRoom = () => {
    const name = prompt('Enter room name:');
    const description = prompt('Enter room description:');
    const maxUsers = prompt('Maximum users (default: 10):');

    if (name && socket) {
      const roomData = {
        name: name.trim(),
        description: description?.trim() || 'Music collaboration room',
        maxUsers: maxUsers ? parseInt(maxUsers) : 10,
        status: 'active'
      };
      
      console.log('룸 생성 요청:', roomData);
      // 올바른 이벤트 이름 사용
      socket.emit('create_music_room', roomData);
    }
  };

  const joinMusicRoom = (roomId: string) => {
    if (socket && currentUser) {
      console.log('룸 참여 요청:', roomId);
      socket.emit('join_music_room', { roomId });
    }
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

          {/* 디버그 정보 */}
          <div className={styles.debugInfo}>
            <p>연결 상태: {socket?.connected ? '✅ 연결됨' : '❌ 끊어짐'}</p>
            <p>사용자: {currentUser}</p>
            <p>룸 개수: {musicRooms.length}</p>
            <button onClick={loadMusicRooms} className={styles.refreshBtn}>
              🔄 룸 목록 새로고침
            </button>
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
                <div className={styles.emptyTitle}>Loading Music Rooms...</div>
                <div className={styles.emptyDescription}>
                  {socket?.connected ? '서버에서 룸 목록을 가져오는 중...' : '서버에 연결 중...'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}