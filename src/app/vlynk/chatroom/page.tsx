'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/app/components/Header';
import { io, Socket } from 'socket.io-client';
import styles from './chatroom.module.css';

interface Room {
  id: string;
  name: string;
  userCount: number;
  maxUsers: number;
  hasPassword: boolean;
  creator: string;
  lastMessage: string;
  lastMessageTime: number;
}

interface Message {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
  type: string;
  fileUrl?: string;
  fileSize?: number;
}

interface User {
  id: string;
  username: string;
  role: string;
}

export default function ChatroomPage() {
  // Socket 및 연결 상태
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [connectedUsers, setConnectedUsers] = useState<number>(0);
  
  // 사용자 상태
  const [currentUser, setCurrentUser] = useState<User>({ id: 'GUEST', username: 'GUEST', role: 'MEMBER' });
  const [username, setUsername] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  
  // 채팅 상태
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChatView, setShowChatView] = useState(false);
  
  // 룸 생성
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [newRoomMaxUsers, setNewRoomMaxUsers] = useState(10);
  
  // 파일 업로드 상태
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loginInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      console.log('🔗 Socket connected:', newSocket.id);
    });

    newSocket.on('connect_error', (error) => {
      setConnectionStatus('Connection Failed');
      console.error('❌ Connection error:', error);
    });

    newSocket.on('disconnect', (reason) => {
      setConnectionStatus('Disconnected');
      console.log('🔌 Disconnected:', reason);
    });

    // VLYNK 서버 이벤트
    newSocket.on('welcome', (data) => {
      console.log('🎉 Welcome:', data.message);
    });

    newSocket.on('user:registered', (userData) => {
      setCurrentUser({
        id: userData.id,
        username: userData.username || 'GUEST',
        role: 'MEMBER'
      });
      console.log('👤 User registered:', userData);
    });

    newSocket.on('users:updated', (data) => {
      const userCount = data.totalUsers || data.length || 0;
      setConnectedUsers(userCount);
    });

    // 채팅룸 이벤트
    newSocket.on('chat:messages', (messages: Message[]) => {
      setMessages(messages);
    });

    newSocket.on('chat:room_info', (roomInfo) => {
      console.log('🏠 Room info:', roomInfo);
    });

    newSocket.on('chat:new_message', (messageData: Message) => {
      setMessages(prev => [...prev, messageData]);
    });

    // 파일 업로드 완료 이벤트
    newSocket.on('file:uploaded', (fileData) => {
      console.log('📎 File uploaded:', fileData);
      // 파일 메시지를 채팅에 추가
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        userId: currentUser.id,
        username: currentUser.username,
        message: fileData.originalName,
        timestamp: new Date().toISOString(),
        type: fileData.type,
        fileUrl: fileData.url,
        fileSize: fileData.size
      }]);
    });

    newSocket.on('chat:user_joined', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        userId: 'system',
        username: 'SYSTEM',
        message: data.message,
        timestamp: new Date().toISOString(),
        type: 'system'
      }]);
    });

    newSocket.on('chat:user_left', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        userId: 'system',
        username: 'SYSTEM',
        message: data.message,
        timestamp: new Date().toISOString(),
        type: 'system'
      }]);
    });

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);



  const handleLogin = () => {
    if (username.trim() && socket) {
      setShowLogin(false);
      socket.emit('user:register', {
        username: username.trim(),
        joinedAt: new Date().toISOString()
      });
    }
  };

  const joinRoom = (room: Room) => {
    if (socket && room) {
      setCurrentRoom(room);
      setMessages([]);
      setShowChatView(true);
      socket.emit('chat:join', room.id);
    }
  };

  const leaveRoom = () => {
    if (socket && currentRoom) {
      socket.emit('chat:leave', currentRoom.id);
      setShowChatView(false);
      setCurrentRoom(null);
      setMessages([]);
    }
  };

  const sendMessage = () => {
    if (socket && newMessage.trim() && currentRoom) {
      socket.emit('chat:message', {
        roomId: currentRoom.id,
        message: newMessage.trim(),
        type: 'text'
      });
      setNewMessage('');
    }
  };

  // 파일 업로드 관련 함수들
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 파일 크기 체크 (100MB)
      if (file.size > 100 * 1024 * 1024) {
        alert('파일 크기는 100MB를 초과할 수 없습니다.');
        return;
      }

      // 파일 타입 체크
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/flac',
        'video/mp4', 'video/webm'
      ];

      if (!allowedTypes.includes(file.type)) {
        alert('지원하지 않는 파일 형식입니다.\n지원 형식: 이미지(jpg, png, gif, webp), 음성(mp3, wav, ogg, aac, flac), 동영상(mp4, webm)');
        return;
      }

      setSelectedFile(file);
      uploadFile(file);
    }
    
    // 파일 입력 리셋
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowFileMenu(false);
  };

  const uploadFile = async (file: File) => {
    if (!file || !currentRoom) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('files', file);

      const response = await fetch('/api/upload/chat', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('업로드 실패');
      }

      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        const fileData = result.data[0];
        
        // 파일 메시지 전송
        if (socket) {
          socket.emit('chat:message', {
            roomId: currentRoom.id,
            message: fileData.originalName,
            type: file.type.startsWith('image/') ? 'image' : 
                  file.type.startsWith('audio/') ? 'audio' : 
                  file.type.startsWith('video/') ? 'video' : 'file',
            fileUrl: fileData.url,
            fileSize: fileData.size,
            originalName: fileData.originalName
          });
        }
        
        console.log('📎 File uploaded successfully:', fileData);
      } else {
        throw new Error('서버 응답 오류');
      }
      
    } catch (error) {
      console.error('❌ File upload error:', error);
      alert('파일 업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderFileMessage = (msg: Message) => {
    if (!msg.fileUrl) return msg.message;

    switch (msg.type) {
      case 'image':
        return (
          <div className={styles.fileMessage}>
            <div className={styles.fileName}>📷 {msg.message}</div>
            <img 
              src={msg.fileUrl} 
              alt={msg.message}
              className={styles.chatImage}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            {msg.fileSize && (
              <div className={styles.fileSize}>{formatFileSize(msg.fileSize)}</div>
            )}
          </div>
        );
      
      case 'audio':
        return (
          <div className={styles.fileMessage}>
            <div className={styles.fileName}>🎵 {msg.message}</div>
            <audio 
              controls 
              className={styles.chatAudio}
              preload="metadata"
            >
              <source src={msg.fileUrl} />
              브라우저가 오디오를 지원하지 않습니다.
            </audio>
            {msg.fileSize && (
              <div className={styles.fileSize}>{formatFileSize(msg.fileSize)}</div>
            )}
          </div>
        );
      
      case 'video':
        return (
          <div className={styles.fileMessage}>
            <div className={styles.fileName}>🎬 {msg.message}</div>
            <video 
              controls 
              className={styles.chatVideo}
              preload="metadata"
            >
              <source src={msg.fileUrl} />
              브라우저가 비디오를 지원하지 않습니다.
            </video>
            {msg.fileSize && (
              <div className={styles.fileSize}>{formatFileSize(msg.fileSize)}</div>
            )}
          </div>
        );
      
      default:
        return (
          <div className={styles.fileMessage}>
            <div className={styles.fileName}>📎 {msg.message}</div>
            <a 
              href={msg.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.fileDownload}
            >
              파일 다운로드
            </a>
            {msg.fileSize && (
              <div className={styles.fileSize}>{formatFileSize(msg.fileSize)}</div>
            )}
          </div>
        );
    }
  };

  const createRoom = () => {
    if (newRoomName.trim()) {
      const newRoom: Room = {
        id: `room_${Date.now()}`,
        name: newRoomName.trim(),
        userCount: 1,
        maxUsers: newRoomMaxUsers,
        hasPassword: newRoomPassword.length > 0,
        creator: currentUser.username,
        lastMessage: 'Room created!',
        lastMessageTime: Date.now()
      };
      
      setRooms(prev => [...prev, newRoom]);
      setShowCreateRoom(false);
      setNewRoomName('');
      setNewRoomPassword('');
      setNewRoomMaxUsers(10);
      
      // 방 생성 후 바로 입장
      joinRoom(newRoom);
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'NOW';
    if (minutes < 60) return `${minutes}M`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}H`;
    return `${Math.floor(minutes / 1440)}D`;
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 컬럼 분배 (index.html과 동일)
  const leftColumnRooms = rooms.filter((_, index) => index % 2 === 0);
  const rightColumnRooms = rooms.filter((_, index) => index % 2 === 1);

  if (showLogin) {
    return (
      <div className={styles.container}>
        <Header />
        
        {/* 로그인 오버레이 */}
        <div className={styles.loginOverlay}>
          <div className={styles.loginBox}>
            <h2 className={styles.loginTitle}>ENTER VVCKD CHAT</h2>
            <p className={styles.loginSubtext}>CHOOSE YOUR USERNAME</p>
            
            <input
              ref={loginInputRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ENTER USERNAME"
              className={styles.loginInput}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
              autoFocus
            />
            
            <button
              onClick={handleLogin}
              disabled={!username.trim()}
              className={styles.loginBtn}
            >
              JOIN CHAT
            </button>
            
            <div className={styles.connectionStatus}>
              STATUS: <span className={connectionStatus === 'Connected' ? styles.connected : styles.disconnected}>
                {connectionStatus}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showChatView && currentRoom) {
    return (
      <div className={styles.container}>
        <Header />
        
        {/* 채팅 뷰 */}
        <div className={styles.chatView}>
          <div className={styles.chatHeaderBar}>
            <div className={styles.roomInfo}>
              ROOM: {currentRoom.name} | USERS: {currentRoom.userCount}/{currentRoom.maxUsers}
            </div>
            <button onClick={leaveRoom} className={styles.backBtn}>
              BACK TO LOBBY
            </button>
          </div>
          
          <div className={styles.chatArea}>
            <div className={styles.messagesContainer}>
              {messages.length === 0 ? (
                <div className={styles.noMessages}>
                  <p>NO MESSAGES YET</p>
                  <p>BE THE FIRST TO SAY SOMETHING!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`${styles.message} ${
                    msg.type === 'system' ? styles.systemMessage : 
                    msg.userId === currentUser.id ? styles.myMessage : styles.otherMessage
                  }`}>
                    <div className={styles.messageHeader}>
                      <span className={styles.messageUser}>
                        {msg.username === currentUser.username ? 'YOU' : msg.username}
                      </span>
                      <span className={styles.messageTime}>
                        {formatMessageTime(msg.timestamp)}
                      </span>
                    </div>
                    <div className={styles.messageContent}>
                      {msg.type === 'text' ? msg.message : renderFileMessage(msg)}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className={styles.inputArea}>
              <div className={styles.inputContainer}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="TYPE YOUR MESSAGE..."
                  className={styles.messageInput}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  maxLength={500}
                  disabled={isUploading}
                />
                
                <div className={styles.fileUploadSection}>
                  <button
                    onClick={() => setShowFileMenu(!showFileMenu)}
                    className={styles.fileBtn}
                    disabled={isUploading}
                    title="파일 업로드"
                  >
                    📎
                  </button>
                  
                  {showFileMenu && (
                    <div className={styles.fileMenu}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={styles.fileMenuBtn}
                      >
                        📷 IMAGE
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={styles.fileMenuBtn}
                      >
                        🎵 AUDIO
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={styles.fileMenuBtn}
                      >
                        🎬 VIDEO
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isUploading}
                className={styles.sendBtn}
              >
                {isUploading ? 'UPLOADING...' : 'SEND'}
              </button>
              
              {/* 숨겨진 파일 입력 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,audio/*,video/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              {/* 업로드 상태 표시 */}
              {isUploading && selectedFile && (
                <div className={styles.uploadStatus}>
                  <div className={styles.uploadProgress}>
                    📤 UPLOADING: {selectedFile.name}
                    <div className={styles.loadingDots}>
                      <span>.</span><span>.</span><span>.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header />
      
      {/* 사용자 정보 */}
      <div className={styles.userInfo}>
        USER: <span>{currentUser.username}</span>
        <span className={styles.userRole}>[{currentUser.role}]</span>
      </div>

      {/* CREATE ROOM 버튼 */}
      <div className={styles.createSection}>
        <button
          onClick={() => setShowCreateRoom(true)}
          className={styles.createRoomBtn}
        >
          CREATE ROOM
        </button>
      </div>

      {/* 메인 컨테이너 */}
      <div className={styles.mainContainer}>
        <div className={styles.chatHeader}>
          <h1>VVCKD ROOM <span className={styles.cursor}>▌</span></h1>
          <p className={styles.statusText}>
            ONLINE: {connectedUsers} USERS | STATUS: {connectionStatus}
          </p>
        </div>
        
        <div className={styles.chatHub}>
          {rooms.length === 0 ? (
            <div className={styles.noRooms}>
              <p>NO ACTIVE ROOMS</p>
              <p>CREATE A ROOM TO GET STARTED!</p>
            </div>
          ) : (
            <>
              <div className={styles.chatColumn}>
                {leftColumnRooms.map((room) => (
                  <div
                    key={room.id}
                    className={styles.chatRoom}
                    onClick={() => joinRoom(room)}
                  >
                    <div className={styles.chatTitle}>
                      {room.name} [{room.userCount}/{room.maxUsers}]
                      {room.hasPassword && ' 🔒'}
                    </div>
                    <div className={styles.chatTime}>
                      {formatTime(room.lastMessageTime)}
                    </div>
                    
                    <div className={styles.preview}>
                      ROOM: {room.name}
                      <br />
                      CREATOR: {room.creator}
                      <br />
                      USERS: {room.userCount}/{room.maxUsers}
                      <br />
                      LAST MSG: {room.lastMessage}
                      <br />
                      {room.hasPassword ? 'PASSWORD PROTECTED' : 'PUBLIC ROOM'}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className={styles.chatColumn}>
                {rightColumnRooms.map((room) => (
                  <div
                    key={room.id}
                    className={styles.chatRoom}
                    onClick={() => joinRoom(room)}
                  >
                    <div className={styles.chatTitle}>
                      {room.name} [{room.userCount}/{room.maxUsers}]
                      {room.hasPassword && ' 🔒'}
                    </div>
                    <div className={styles.chatTime}>
                      {formatTime(room.lastMessageTime)}
                    </div>
                    
                    <div className={styles.preview}>
                      ROOM: {room.name}
                      <br />
                      CREATOR: {room.creator}
                      <br />
                      USERS: {room.userCount}/{room.maxUsers}
                      <br />
                      LAST MSG: {room.lastMessage}
                      <br />
                      {room.hasPassword ? 'PASSWORD PROTECTED' : 'PUBLIC ROOM'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* CREATE ROOM 모달 */}
      {showCreateRoom && (
        <div className={styles.createRoomModal}>
          <div className={styles.createRoomContent}>
            <h2>CREATE NEW ROOM</h2>
            
            <div className={styles.formGroup}>
              <label>ROOM NAME:</label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="ENTER ROOM NAME"
                className={styles.formInput}
                maxLength={30}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>PASSWORD (OPTIONAL):</label>
              <input
                type="password"
                value={newRoomPassword}
                onChange={(e) => setNewRoomPassword(e.target.value)}
                placeholder="LEAVE EMPTY FOR PUBLIC"
                className={styles.formInput}
                maxLength={20}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>MAX USERS:</label>
              <input
                type="number"
                value={newRoomMaxUsers}
                onChange={(e) => setNewRoomMaxUsers(Math.max(2, Math.min(100, parseInt(e.target.value) || 10)))}
                min="2"
                max="100"
                className={styles.formInput}
              />
            </div>
            
            <div className={styles.modalActions}>
              <button onClick={createRoom} className={styles.createBtn}>
                CREATE
              </button>
              <button onClick={() => setShowCreateRoom(false)} className={styles.cancelBtn}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}