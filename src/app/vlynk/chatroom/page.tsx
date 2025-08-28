'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  type: 'chat';
}

interface Message {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'system';
  fileUrl?: string;
  fileSize?: number;
}

interface User {
  id: string;
  username: string;
  role: 'ADMIN' | 'MEMBER';
  namespace: 'chat';
}

export default function ChatroomPage() {
  // ===== 모든 기존 state와 함수들 그대로 유지 =====
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('연결 중...');
  const [connectedUsers, setConnectedUsers] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChatView, setShowChatView] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [newRoomMaxUsers, setNewRoomMaxUsers] = useState(10);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loginInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== 모든 기존 useEffect와 함수들 그대로 유지 =====
  useEffect(() => {
    const newSocket = io('http://localhost:3001/chat', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    newSocket.on('connect', () => {
      console.log('🗨️ Connected to chat namespace');
      setConnectionStatus('연결됨');
      setSocket(newSocket);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🗨️ Disconnected from chat:', reason);
      setConnectionStatus('연결 끊김');
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('🗨️ Connection error:', error);
      setConnectionStatus('연결 실패');
    });

    newSocket.on('user:login_success', (data) => {
      console.log('👤 Login success:', data.user);
      setCurrentUser(data.user);
      setConnectedUsers(data.connectedUsers);
      setShowLogin(false);
    });

    newSocket.on('rooms:list', (roomsList: Room[]) => {
      console.log('🏠 Rooms updated:', roomsList.length);
      setRooms(roomsList);
    });

    newSocket.on('room:created', (data) => {
      console.log('🏠 Room created:', data.room);
      if (data.room) {
        joinRoom(data.room.id);
      }
    });

    newSocket.on('room:joined', (data) => {
      console.log('🚪 Successfully joined room:', data.room);
      setCurrentRoom(data.room);
      setMessages(data.messages || []);
      setShowChatView(true);
    });

    newSocket.on('room:error', (data) => {
      console.error('❌ Room error:', data.message);
      alert(data.message);
    });

    newSocket.on('chat:message', (message: Message) => {
      console.log('💬 New message received:', message);
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('chat:user_joined', (data) => {
      console.log('👋 User joined:', data.user?.username);
      setMessages(prev => [...prev, {
        id: `system_${Date.now()}`,
        userId: 'system',
        username: 'SYSTEM',
        message: data.message,
        timestamp: new Date().toISOString(),
        type: 'system'
      }]);
    });

    newSocket.on('chat:user_left', (data) => {
      console.log('👋 User left:', data.user?.username);
      setMessages(prev => [...prev, {
        id: `system_${Date.now()}`,
        userId: 'system',
        username: 'SYSTEM',
        message: data.message,
        timestamp: new Date().toISOString(),
        type: 'system'
      }]);
    });

    return () => {
      console.log('🗨️ Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogin = useCallback(() => {
    if (!username.trim() || !socket) return;

    const userData = {
      username: username.trim(),
      role: 'MEMBER' as const
    };

    console.log('🚀 Attempting login:', userData);
    socket.emit('user:login', userData);
  }, [username, socket]);

  const createRoom = useCallback(() => {
    if (!newRoomName.trim() || !socket) return;

    const roomData = {
      name: newRoomName.trim(),
      password: newRoomPassword.trim(),
      maxUsers: newRoomMaxUsers
    };

    console.log('🏠 Creating room:', roomData);
    socket.emit('room:create', roomData);
    
    setShowCreateRoom(false);
    setNewRoomName('');
    setNewRoomPassword('');
    setNewRoomMaxUsers(10);
  }, [newRoomName, newRoomPassword, newRoomMaxUsers, socket]);

  const joinRoom = useCallback((roomId: string, password: string = '') => {
    if (!socket) return;

    const joinData = {
      roomId,
      password
    };

    console.log('🚪 Joining room:', joinData);
    socket.emit('room:join', joinData);
  }, [socket]);

  const leaveRoom = useCallback(() => {
    if (!socket || !currentRoom) return;
    
    console.log('🚪 Leaving room:', currentRoom.name);
    setCurrentRoom(null);
    setMessages([]);
    setShowChatView(false);
  }, [socket, currentRoom]);

  const sendMessage = useCallback(() => {
    if (!newMessage.trim() || !socket || !currentRoom) return;

    const messageData = {
      message: newMessage.trim(),
      type: 'text' as const
    };

    console.log('💬 Sending message:', messageData);
    socket.emit('chat:message', messageData);
    setNewMessage('');
  }, [newMessage, socket, currentRoom]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file || !socket || !currentRoom) return;

    setIsUploading(true);
    setShowFileMenu(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload/chat', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      if (data.success) {
        const messageData = {
          message: data.file.originalName,
          type: data.file.type,
          fileUrl: data.file.url,
          fileSize: data.file.size
        };

        socket.emit('chat:message', messageData);
        console.log('📎 File uploaded and sent:', data.file.originalName);
      }
    } catch (error) {
      console.error('📎 Upload failed:', error);
      alert('파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  }, [socket, currentRoom]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showLogin) {
        handleLogin();
      } else {
        sendMessage();
      }
    }
  }, [showLogin, handleLogin, sendMessage]);

  const formatTime = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = (msg: Message) => {
    switch (msg.type) {
      case 'image':
        return (
          <div className={styles.fileMessage}>
            <div className={styles.fileName}>📷 {msg.message}</div>
            {msg.fileUrl && (
              <img 
                src={msg.fileUrl} 
                alt={msg.message}
                className={styles.chatImage}
                onClick={() => window.open(msg.fileUrl, '_blank')}
              />
            )}
          </div>
        );
      case 'audio':
        return (
          <div className={styles.fileMessage}>
            <div className={styles.fileName}>🎵 {msg.message}</div>
            {msg.fileUrl && (
              <audio controls src={msg.fileUrl} className={styles.chatAudio} />
            )}
          </div>
        );
      case 'video':
        return (
          <div className={styles.fileMessage}>
            <div className={styles.fileName}>🎬 {msg.message}</div>
            {msg.fileUrl && (
              <video controls src={msg.fileUrl} className={styles.chatVideo} />
            )}
          </div>
        );
      default:
        return (
          <div className={styles.fileMessage}>
            <div className={styles.fileName}>📎 {msg.message}</div>
            {msg.fileSize && (
              <div className={styles.fileSize}>
                {(msg.fileSize / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
            {msg.fileUrl && (
              <a 
                href={msg.fileUrl} 
                download 
                className={styles.fileDownload}
                target="_blank"
                rel="noopener noreferrer"
              >
                📥 다운로드
              </a>
            )}
          </div>
        );
    }
  };

  // ===== 🎨 index.html 스타일로 변경된 렌더링 부분 =====

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
            <div className={styles.loginTitle}>CHAT ACCESS TERMINAL</div>
            <div className={styles.loginSubtext}>ENTER USER CREDENTIALS</div>
            <input
              ref={loginInputRef}
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
              INITIALIZE CONNECTION
            </button>
            <div className={styles.connectionStatus}>
              상태: <span className={connectionStatus === '연결됨' ? styles.connected : styles.disconnected}>
                {connectionStatus}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 채팅룸 화면 (index.html의 chat-view 스타일)
  if (showChatView && currentRoom) {
    return (
      <div className={styles.chatView}>
        <Header />
        
        <div className={styles.chatHeaderBar}>
          <div className={styles.roomInfo}>
            🏠 {currentRoom.name} | 👥 {currentRoom.userCount}/{currentRoom.maxUsers} | BY {currentRoom.creator}
          </div>
          <button onClick={leaveRoom} className={styles.backBtn}>
            BACK
          </button>
        </div>

        <div className={styles.chatArea}>
          <div className={styles.messagesContainer}>
            {messages.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#666', 
                padding: '50px',
                fontSize: '10px' 
              }}>
                💬 대화를 시작해보세요!
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`${styles.message} ${
                    msg.userId === currentUser?.id ? styles.ownMessage : 
                    msg.type === 'system' ? styles.systemMessage : ''
                  }`}
                >
                  <div className={styles.messageHeader}>
                    <span className={styles.messageUser}>{msg.username}</span>
                    <span className={styles.messageTime}>
                      {formatMessageTime(msg.timestamp)}
                    </span>
                  </div>
                  <div className={styles.messageContent}>
                    {msg.type === 'text' || msg.type === 'system' ? 
                      msg.message : renderMessage(msg)
                    }
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* index.html 스타일의 입력 영역 */}
          <div className={styles.inputArea}>
            {isUploading && (
              <div className={styles.uploadStatus}>
                <div className={styles.uploadProgress}>
                  파일 업로드 중<span className={styles.loadingDots}>
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                </div>
              </div>
            )}
            
            <div className={styles.inputContainer}>
              <div className={styles.fileUploadSection}>
                <button
                  onClick={() => setShowFileMenu(!showFileMenu)}
                  className={styles.fileBtn}
                  disabled={isUploading}
                >
                  📎
                </button>
                
                {showFileMenu && (
                  <div className={styles.fileMenu}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      style={{ display: 'none' }}
                      accept="image/*,audio/*,video/*,.pdf,.txt,.doc,.docx"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className={styles.fileMenuBtn}
                    >
                      📁 파일 선택
                    </button>
                  </div>
                )}
              </div>

              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                className={styles.messageInput}
                onKeyPress={handleKeyPress}
                disabled={isUploading}
                rows={1}
                style={{
                  minHeight: '40px',
                  maxHeight: '120px',
                  resize: 'none',
                  overflow: 'auto'
                }}
              />
              
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isUploading}
                className={styles.sendBtn}
              >
                SEND
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 메인 룸 목록 화면 (index.html 스타일)
  const leftColumnRooms = rooms.filter((_, index) => index % 2 === 0);
  const rightColumnRooms = rooms.filter((_, index) => index % 2 === 1);

  return (
    <div className={styles.container}>
      <Header />
      
      {/* index.html 스타일의 사용자 정보 */}
      <div className={styles.userInfo}>
        USER: <span id="currentUser">{currentUser?.username}</span>
        <span className={styles.userRole} id="userRole">[{currentUser?.role}]</span>
      </div>

      {/* index.html 스타일의 CREATE ROOM 버튼 */}
      <div className={styles.createRoomSection}>
        <button
          onClick={() => setShowCreateRoom(true)}
          className={styles.createRoomBtn}
        >
          CREATE ROOM
        </button>
      </div>

      {/* index.html 스타일의 메인 컨테이너 */}
      <div className={styles.mainContainer}>
        <div className={styles.chatHeader}>
          <h1>VVCKD ROOM <span className={styles.cursor}>▌</span></h1>
        </div>

        {rooms.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#666', 
            padding: '100px 20px',
            fontSize: '12px' 
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px', color: '#ff6600' }}>🏠</div>
            <div style={{ color: '#ff6600', marginBottom: '10px' }}>채팅룸이 없습니다</div>
            <div>첫 번째 채팅룸을 만들어보세요!</div>
          </div>
        ) : (
          <div className={styles.chatHub}>
            <div className={styles.chatColumn}>
              {leftColumnRooms.map((room) => (
                <div 
                  key={room.id} 
                  className={styles.chatRoom}
                  onClick={() => {
                    const password = room.hasPassword ? 
                      prompt('비밀번호를 입력하세요:') : '';
                    if (room.hasPassword && !password) return;
                    joinRoom(room.id, password || '');
                  }}
                >
                  <div className={styles.chatTitle}>
                    {room.hasPassword && '🔒 '}{room.name}
                  </div>
                  <div className={styles.chatTime}>
                    {formatTime(room.lastMessageTime)}
                  </div>
                  
                  {/* index.html 스타일의 프리뷰 */}
                  <div className={styles.preview}>
                    👥 {room.userCount}/{room.maxUsers}
{room.creator && `\nBY ${room.creator}`}
{room.lastMessage && `\n\n마지막 메시지:\n${room.lastMessage.length > 50 ? room.lastMessage.substring(0, 50) + '...' : room.lastMessage}`}
                  </div>
                </div>
              ))}
            </div>
            
            <div className={styles.chatColumn}>
              {rightColumnRooms.map((room) => (
                <div 
                  key={room.id} 
                  className={styles.chatRoom}
                  onClick={() => {
                    const password = room.hasPassword ? 
                      prompt('비밀번호를 입력하세요:') : '';
                    if (room.hasPassword && !password) return;
                    joinRoom(room.id, password || '');
                  }}
                >
                  <div className={styles.chatTitle}>
                    {room.hasPassword && '🔒 '}{room.name}
                  </div>
                  <div className={styles.chatTime}>
                    {formatTime(room.lastMessageTime)}
                  </div>
                  
                  <div className={styles.preview}>
                    👥 {room.userCount}/{room.maxUsers}
{room.creator && `\nBY ${room.creator}`}
{room.lastMessage && `\n\n마지막 메시지:\n${room.lastMessage.length > 50 ? room.lastMessage.substring(0, 50) + '...' : room.lastMessage}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 룸 생성 모달 */}
      {showCreateRoom && (
        <div className={styles.createModal}>
          <div className={styles.createBox}>
            <div className={styles.createTitle}>새 채팅룸 만들기</div>
            
            <div className={styles.createField}>
              <label>룸 이름</label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="룸 이름을 입력하세요"
                className={styles.createInput}
                maxLength={30}
              />
            </div>
            
            <div className={styles.createField}>
              <label>비밀번호 (선택사항)</label>
              <input
                type="password"
                value={newRoomPassword}
                onChange={(e) => setNewRoomPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className={styles.createInput}
                maxLength={20}
              />
            </div>
            
            <div className={styles.createField}>
              <label>최대 인원</label>
              <input
                type="number"
                value={newRoomMaxUsers}
                onChange={(e) => setNewRoomMaxUsers(Math.max(2, Math.min(50, parseInt(e.target.value) || 10)))}
                min="2"
                max="50"
                className={styles.createInput}
              />
            </div>
            
            <div className={styles.createActions}>
              <button
                onClick={createRoom}
                disabled={!newRoomName.trim()}
                className={styles.createBtn}
              >
                CREATE
              </button>
              <button
                onClick={() => {
                  setShowCreateRoom(false);
                  setNewRoomName('');
                  setNewRoomPassword('');
                  setNewRoomMaxUsers(10);
                }}
                className={styles.cancelBtn}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}