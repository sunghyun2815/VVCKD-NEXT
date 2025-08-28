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
  hasPassword: boolean;
  creator: string;
  lastMessage: string;
  lastMessageTime: number;
}

interface User {
  id: string;
  username: string;
  role: string;
}

interface SocketError {
  message: string;
  code?: string;
}

interface UserData {
  id: string;
  username: string;
  role?: string;
}

interface WelcomeData {
  message: string;
  socketId: string;
  timestamp: string;
}

interface UsersUpdateData {
  users: UserData[];
  totalUsers: number;
}

interface RoomData {
  id: string;
  name: string;
  description?: string;
  userCount: number;
  maxUsers: number;
  hasPassword: boolean;
  creator: string;
  lastMessage: string;
  lastMessageTime: number;
  type?: string;
}

interface RoomsListData {
  rooms: RoomData[];
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
  
  // 룸 생성
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [newRoomMaxUsers, setNewRoomMaxUsers] = useState(10);
  const [newRoomDescription, setNewRoomDescription] = useState('');

  const loginInputRef = useRef<HTMLInputElement>(null);

  // Socket.IO 연결 - chatroom과 동일한 방식으로 수정
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
    newSocket.on('welcome', (data: WelcomeData) => {
      console.log('🎉 Music Welcome:', data.message);
    });

    newSocket.on('user:registered', (userData: UserData) => {
      setCurrentUser({
        id: userData.id,
        username: userData.username || 'GUEST',
        role: 'MEMBER'
      });
      console.log('👤 Music User registered:', userData);
    });

    newSocket.on('users:updated', (data: UsersUpdateData) => {
      const userCount = data.totalUsers || data.users?.length || 0;
      setConnectedUsers(userCount);
    });

    // 음악 룸 목록 관련 이벤트 (chatroom과 동일한 이벤트 사용)
    newSocket.on('rooms:list', (data: RoomsListData) => {
      console.log('📝 Music Rooms list received:', data.rooms);
      // 음악 룸으로 필터링 또는 변환
      const musicRoomsList = data.rooms.map((room: RoomData) => ({
        id: room.id,
        name: room.name,
        description: room.description || 'Music collaboration room',
        participants: room.userCount || 0,
        maxUsers: room.maxUsers || 10,
        musicCount: 0, // 기본값
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
      // 룸 목록 새로고침
      requestRoomList();
    });

    newSocket.on('room:joined', (data: any) => {
      console.log('🎵 Successfully joined music room:', data);
      alert(`Joined room: ${data.roomName} (${data.userCount}/${data.maxUsers} users)`);
    });

    newSocket.on('room:user_joined', (data: any) => {
      console.log('👥 User joined room:', data);
      // 룸 목록 새로고침하여 참가자 수 업데이트
      requestRoomList();
    });

    newSocket.on('room:user_left', (data: any) => {
      console.log('👋 User left room:', data);
      // 룸 목록 새로고침하여 참가자 수 업데이트
      requestRoomList();
    });

    newSocket.on('room:updated', (data: any) => {
      console.log('🔄 Music room updated:', data);
      // 해당 룸 업데이트
      setMusicRooms(prev => prev.map(room => 
        room.id === data.room.id ? { ...room, ...data.room } : room
      ));
    });

    newSocket.on('room:error', (error: SocketError) => {
      console.error('❌ Music Room error:', error);
      alert(`Room Error: ${error.message}`);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // 룸 목록 요청
  const requestRoomList = () => {
    if (socket && currentUser.id !== 'GUEST') {
      console.log('📋 Requesting music room list...', {
        socketConnected: socket.connected,
        currentUser: currentUser.username,
        socketId: socket.id
      });
      
      // chatroom과 동일한 이벤트 사용하되, 서버에서 구분할 수 있도록 추가 파라미터 전송
      socket.emit('rooms:list', { type: 'music' });
      console.log('📤 Sent rooms:list event with type: music');
    } else {
      console.warn('⚠️ Cannot request room list - not logged in or no socket');
    }
  };

  // 로그인 처리
  const handleLogin = () => {
    if (username.trim() && socket) {
      console.log('🔑 Music Login attempt:', username.trim());
      
      // chatroom과 동일한 방식으로 사용자 등록
      socket.emit('user:register', {
        username: username.trim(),
        type: 'music' // 음악 룸 사용자임을 표시
      });
      
      // 로그인 상태 변경을 약간 지연시켜 소켓 연결이 안정화되도록 함
      setTimeout(() => {
        setUsername(username.trim());
        setShowLogin(false);
        requestRoomList();
      }, 500);
    }
  };

  // 음악 룸 생성
  const createMusicRoom = () => {
    if (socket && currentUser.id !== 'GUEST') {
      const roomData = {
        name: newRoomName || `Music Room ${Date.now()}`,
        password: newRoomPassword,
        maxUsers: newRoomMaxUsers || 10,
        description: newRoomDescription || 'Music collaboration room',
        type: 'music' // 음악 룸임을 표시
      };
      
      console.log('🎵 Creating music room:', roomData);
      
      // chatroom과 동일한 이벤트 사용
      socket.emit('room:create', roomData);
      console.log('📤 Sent room:create event');
      
      // 폼 초기화
      setNewRoomName('');
      setNewRoomPassword('');
      setNewRoomMaxUsers(10);
      setNewRoomDescription('');
      setShowCreateRoom(false);
    } else {
      console.error('❌ Cannot create room - not logged in or no socket');
      alert('Please login first!');
    }
  };

  // 간단한 룸 생성 (prompt 사용)
  const quickCreateMusicRoom = () => {
    const name = prompt('Enter music room name:');
    if (!name) return;
    
    const description = prompt('Enter room description:') || 'Music collaboration room';
    const maxUsersInput = prompt('Maximum users (default: 10):');
    const maxUsers = maxUsersInput ? parseInt(maxUsersInput) : 10;

    if (socket && currentUser.id !== 'GUEST') {
      const roomData = {
        name: name.trim(),
        password: '', // 비밀번호 없음
        maxUsers: maxUsers,
        description: description.trim(),
        type: 'music'
      };
      
      console.log('🎵 Quick creating music room:', roomData);
      socket.emit('room:create', roomData);
      console.log('📤 Sent quick room:create event');
    } else {
      console.error('❌ Cannot create room - not logged in or no socket');
      alert('Please login first!');
    }
  };

  // 음악 룸 참여
  const joinMusicRoom = (roomId: string) => {
    if (socket && currentUser.id !== 'GUEST') {
      console.log('🎵 Attempting to join music room:', {
        roomId,
        currentUser: currentUser.username,
        socketConnected: socket.connected,
        socketId: socket.id
      });
      
      // 비밀번호가 필요한지 확인
      const room = musicRooms.find(r => r.id === roomId);
      let password = '';
      
      if (room?.hasPassword) {
        password = prompt('Enter room password:') || '';
        if (!password) {
          console.log('❌ Password required but not provided');
          return;
        }
      }
      
      // 방 참여 요청
      socket.emit('room:join', { 
        roomId,
        type: 'music',
        password: password
      });
      
      console.log('📤 Sent room:join event with data:', { roomId, type: 'music', hasPassword: !!password });
    } else {
      console.error('❌ Cannot join room:', {
        hasSocket: !!socket,
        socketConnected: socket?.connected,
        currentUser: currentUser.id,
        isGuest: currentUser.id === 'GUEST'
      });
      alert('Please login first!');
    }
  };

  // 로그인 화면
  if (showLogin) {
    return (
      <>
        <Header />
        <div className={styles.loginModal}>
          <div className={styles.loginTerminal}>
            <div className={styles.loginTitle}>VLYNK MUSIC ACCESS</div>
            <div className={styles.loginSubtitle}>ENTER USERNAME</div>
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
              ENTER MUSIC
            </button>
            <div className={styles.connectionStatus}>
              Status: <span className={connectionStatus === 'Connected' ? styles.connected : styles.disconnected}>
                {connectionStatus}
              </span>
            </div>
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

        {/* Create Room Section */}
        <div className={styles.addProjectSection}>
          <button className={styles.addBtn} onClick={quickCreateMusicRoom}>
            + CREATE MUSIC ROOM
          </button>
        </div>

        {/* Main Content */}
        <div className={styles.mainContainer}>
          <div className={styles.projectHeader}>
            <h1>VLYNK MUSIC ROOMS <span className={styles.cursor}>▌</span></h1>
            <div className={styles.projectSubtitle}>
              ENHANCED COLLABORATIVE MUSIC WORKSPACE
            </div>
            <div className={styles.statusText}>
              Connection: <span className={connectionStatus === 'Connected' ? styles.connected : styles.disconnected}>
                {connectionStatus}
              </span>
              <span style={{ marginLeft: '20px' }}>
                Users: {connectedUsers} | Rooms: {musicRooms.length}
              </span>
            </div>
          </div>

          {/* Debug/Control Section */}
          <div className={styles.debugInfo}>
            <div style={{ marginBottom: '15px', fontSize: '8px', color: '#666', textAlign: 'left' }}>
              <div>🔗 Socket ID: {socket?.id || 'None'}</div>
              <div>👤 User: {currentUser.username} ({currentUser.id})</div>
              <div>🌐 Connected: {socket?.connected ? '✅ Yes' : '❌ No'}</div>
              <div>📊 Status: {connectionStatus}</div>
              <div>👥 Total Users: {connectedUsers}</div>
              <div>🏠 Music Rooms: {musicRooms.length}</div>
            </div>
            <button onClick={requestRoomList} className={styles.refreshBtn}>
              🔄 REFRESH ROOMS
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
                    onClick={() => {
                      const roomInfo = `
🏠 Room: ${room.name}
📝 Description: ${room.description}
👤 Creator: ${room.creator}
👥 Participants: ${room.participants}/${room.maxUsers}
🎵 Tracks: ${room.musicCount}
🔒 Password: ${room.hasPassword ? 'Yes' : 'No'}
📅 Created: ${new Date(room.createdAt).toLocaleString()}
🆔 Room ID: ${room.id}`;
                      alert(roomInfo);
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
                  <button className={styles.createFirstBtn} onClick={quickCreateMusicRoom}>
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