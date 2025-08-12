'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// 전문가급 훅들
import { useVlynkSocket } from './hooks/useVlynkSocket';
import { useChat } from './hooks/useChat';

// 전문가급 컴포넌트들
import { ConnectionStatus } from './components/ConnectionStatus';

// 타입들
import type { VlynkUser, VlynkRoom } from './types/vlynk.types';

// 스타일
import styles from './vlynk.module.css';

// 관리자 계정 목록
const ADMIN_USERS = ['ADMIN', 'VVCKD', 'MANAGER'];

// 로딩 컴포넌트 (VCKTOR 스타일)
function VlynkLoading() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingTerminal}>
        <div className={styles.loadingTitle}>INITIALIZING VLYNK...</div>
        <div className={styles.loadingBar}>
          <div className={styles.loadingProgress} />
        </div>
        <div className={styles.loadingText}>
          <div>Loading modules... OK</div>
          <div>Establishing connections... OK</div>
          <div>Preparing interface... <span className={styles.blinkCursor}>▌</span></div>
        </div>
      </div>
    </div>
  );
}

// 에러 폴백 컴포넌트 (VCKTOR 스타일)
function VlynkErrorBoundary({ error, resetErrorBoundary }: any) {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorTerminal}>
        <div className={styles.errorTitle}>VLYNK SYSTEM ERROR</div>
        <div className={styles.errorCode}>ERROR CODE: VLYNK_CRASH</div>
        <pre className={styles.errorDetails}>
          {error?.message || 'Unknown system error occurred'}
        </pre>
        <div className={styles.errorActions}>
          <button className={styles.retryBtn} onClick={resetErrorBoundary}>
            RESTART SYSTEM
          </button>
          <button 
            className={styles.reportBtn} 
            onClick={() => console.error('VLYNK Error:', error)}
          >
            REPORT BUG
          </button>
        </div>
      </div>
    </div>
  );
}

// 로그인 모달 컴포넌트 (VCKTOR 스타일)
interface LoginModalProps {
  onLogin: (user: VlynkUser) => void;
}

function LoginModal({ onLogin }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const { emit, isConnected } = useVlynkSocket();

  const handleLogin = useCallback(async () => {
    const trimmedUsername = username.trim().toUpperCase();
    if (!trimmedUsername || !isConnected) return;

    setIsLogging(true);
    
    try {
      // 서버에 사용자 등록
      const success = emit('user join', {
        username: trimmedUsername,
        role: ADMIN_USERS.includes(trimmedUsername) ? 'admin' : 'member'
      });

      if (success) {
        const user: VlynkUser = {
          id: `user_${Date.now()}`,
          username: trimmedUsername,
          role: ADMIN_USERS.includes(trimmedUsername) ? 'admin' : 'member',
          status: 'online',
          joinedAt: new Date(),
          lastActivity: new Date(),
        };

        onLogin(user);
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLogging(false);
    }
  }, [username, isConnected, emit, onLogin]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className={styles.loginModal}>
      <div className={styles.loginTerminal}>
        <div className={styles.loginTitle}>VLYNK ACCESS TERMINAL</div>
        <div className={styles.loginSubtitle}>ENTER USER CREDENTIALS</div>
        
        <div className={styles.connectionIndicator}>
          <ConnectionStatus />
        </div>

        <input
          type="text"
          className={styles.loginInput}
          placeholder="USERNAME"
          maxLength={20}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={!isConnected || isLogging}
          autoFocus
        />
        
        <button 
          className={styles.loginBtn}
          onClick={handleLogin}
          disabled={!isConnected || !username.trim() || isLogging}
        >
          {isLogging ? 'CONNECTING...' : 'INITIALIZE CONNECTION'}
        </button>

        {!isConnected && (
          <div className={styles.loginWarning}>
            ⚠️ Waiting for server connection...
          </div>
        )}
      </div>
    </div>
  );
}

// 사용자 패널 컴포넌트 (VCKTOR의 topCoinBar 스타일)
interface UserPanelProps {
  user: VlynkUser;
  onLogout: () => void;
  onCreateRoom?: () => void;
}

function UserPanel({ user, onLogout, onCreateRoom }: UserPanelProps) {
  const getRoleColor = () => {
    switch (user.role) {
      case 'admin': return styles.adminRole;
      case 'member': return styles.memberRole;
      case 'guest': return styles.guestRole;
      default: return styles.memberRole;
    }
  };

  const getRoleText = () => {
    switch (user.role) {
      case 'admin': return '[ADMIN]';
      case 'member': return '[MEMBER]';
      case 'guest': return '[GUEST]';
      default: return '[USER]';
    }
  };

  return (
    <div className={styles.userPanel}>
      <div className={styles.userInfo}>
        <div className={styles.username}>{user.username}</div>
        <div className={`${styles.userRole} ${getRoleColor()}`}>
          {getRoleText()}
        </div>
        <div className={styles.userStatus} data-status={user.status}>
          {user.status === 'online' && '🟢 ONLINE'}
          {user.status === 'away' && '🟡 AWAY'}
          {user.status === 'offline' && '⚪ OFFLINE'}
        </div>
      </div>
      
      <div className={styles.userActions}>
        {user.role === 'admin' && onCreateRoom && (
          <button className={styles.createRoomBtn} onClick={onCreateRoom}>
            + CREATE ROOM
          </button>
        )}
        <button className={styles.logoutBtn} onClick={onLogout}>
          LOGOUT
        </button>
      </div>
    </div>
  );
}

// 방 목록 컴포넌트 (기본 구현)
interface RoomGridProps {
  rooms: VlynkRoom[];
  onRoomSelect: (room: VlynkRoom) => void;
  currentUser: VlynkUser;
}

function RoomGrid({ rooms, onRoomSelect, currentUser }: RoomGridProps) {
  const { emit } = useVlynkSocket();
  const [roomList, setRoomList] = useState<any[]>([]);

  // 방 목록 로드
  useEffect(() => {
    emit('get room list', {});
  }, [emit]);

  // 서버에서 방 목록 수신
  useEffect(() => {
    // 실제 구현에서는 useChat 훅에서 처리
  }, []);

  if (rooms.length === 0) {
    return (
      <div className={styles.emptyRooms}>
        <div className={styles.emptyTitle}>NO ROOMS AVAILABLE</div>
        <div className={styles.emptySubtitle}>Create the first room to get started!</div>
      </div>
    );
  }

  return (
    <div className={styles.roomGrid}>
      <div className={styles.roomColumns}>
        <div className={styles.roomColumn}>
          {rooms.filter((_, i) => i % 2 === 0).map((room) => (
            <div
              key={room.id}
              className={styles.roomCard}
              onClick={() => onRoomSelect(room)}
            >
              <div className={styles.roomHeader}>
                <span className={styles.roomName}>
                  {room.name}
                  {room.creator === currentUser.username && ' 👑'}
                  {room.hasPassword && ' 🔒'}
                </span>
                <span className={styles.roomTime}>now</span>
              </div>
              <div className={styles.roomPreview}>
                [System] 방에 {room.participants.length}명이 있습니다.
                {room.creator === currentUser.username && '\n[Owner] 당신이 만든 방입니다.'}
                {room.hasPassword && room.creator !== currentUser.username && '\n[Private] 비밀번호로 보호된 방입니다.'}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.roomColumn}>
          {rooms.filter((_, i) => i % 2 === 1).map((room) => (
            <div
              key={room.id}
              className={styles.roomCard}
              onClick={() => onRoomSelect(room)}
            >
              <div className={styles.roomHeader}>
                <span className={styles.roomName}>
                  {room.name}
                  {room.creator === currentUser.username && ' 👑'}
                  {room.hasPassword && ' 🔒'}
                </span>
                <span className={styles.roomTime}>now</span>
              </div>
              <div className={styles.roomPreview}>
                [System] 방에 {room.participants.length}명이 있습니다.
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 채팅 룸 컴포넌트 (기본 구현)
interface ChatRoomProps {
  room: VlynkRoom;
  currentUser: VlynkUser;
  onLeaveRoom: () => void;
}

function ChatRoom({ room, currentUser, onLeaveRoom }: ChatRoomProps) {
  const { 
    messages, 
    typingUsers, 
    roomUserCount, 
    roomMaxUsers,
    sendMessage,
    deleteMessage,
    startTyping,
    stopTyping,
    handleScroll,
    messagesEndRef
  } = useChat();

  const [messageInput, setMessageInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloadDisabled, setDownloadDisabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 메시지 전송
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() && !selectedFile) return;

    let fileData = null;

    // 파일 업로드 처리
    if (selectedFile) {
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('downloadDisabled', downloadDisabled.toString());

        const response = await fetch('/upload', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          fileData = await response.json();
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('File upload error:', error);
        alert('파일 업로드에 실패했습니다.');
        return;
      }
    }

    // 메시지 전송
    const success = await sendMessage(messageInput, { fileData });
    
    if (success) {
      // 입력 초기화
      setMessageInput('');
      setSelectedFile(null);
      setDownloadDisabled(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [messageInput, selectedFile, downloadDisabled, sendMessage]);

  // 타이핑 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    startTyping();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className={styles.chatRoom}>
      {/* 채팅 헤더 */}
      <div className={styles.chatHeader}>
        <div className={styles.roomInfo}>
          <span className={styles.roomName}>ROOM: {room.name}</span>
          <span className={styles.userCount}>
            USERS: {roomUserCount}{roomMaxUsers ? `/${roomMaxUsers}` : ''}
          </span>
        </div>
        <button className={styles.leaveBtn} onClick={onLeaveRoom}>
          LEAVE ROOM
        </button>
      </div>

      {/* 메시지 영역 */}
      <div className={styles.messagesArea} onScroll={handleScroll}>
        <div className={styles.messagesList}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${message.username === currentUser.username ? styles.own : ''}`}
            >
              <div className={styles.messageHeader}>
                <span className={styles.messageUser}>USER: {message.username}</span>
                <div className={styles.messageActions}>
                  <span className={styles.messageTime}>
                    TIME: {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                  {message.username === currentUser.username && (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => deleteMessage(message.id)}
                    >
                      DEL
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.messageContent}>
                {message.content}
              </div>
              {message.fileData && (
                <div className={styles.messageFile}>
                  {/* 파일 표시 로직 */}
                  <div className={styles.fileInfo}>
                    📎 {message.fileData.originalname}
                  </div>
                  {!message.fileData.downloadDisabled && (
                    <a
                      href={message.fileData.url}
                      className={styles.downloadLink}
                      download={message.fileData.originalname}
                    >
                      DOWNLOAD
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 타이핑 인디케이터 */}
        {typingUsers.length > 0 && (
          <div className={styles.typingIndicator}>
            {typingUsers.join(', ')} is typing...
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      <div className={styles.inputArea}>
        <div className={styles.inputLine}>
          <span className={styles.prompt}>MSG@VLYNK:~$</span>
          <input
            type="text"
            className={styles.messageInput}
            placeholder="ENTER MESSAGE..."
            value={messageInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
          />
          <div className={styles.fileSection}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*,audio/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            <button
              className={styles.fileBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              FILE
            </button>
            {selectedFile && (
              <div className={styles.fileOptions}>
                <div className={styles.filePreview}>
                  📎 {selectedFile.name}
                </div>
                <label className={styles.downloadOption}>
                  <input
                    type="checkbox"
                    checked={downloadDisabled}
                    onChange={(e) => setDownloadDisabled(e.target.checked)}
                  />
                  DISABLE DOWNLOAD
                </label>
              </div>
            )}
            <button className={styles.sendBtn} onClick={handleSendMessage}>
              SEND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 메인 VLYNK 페이지 컴포넌트
export default function VlynkPage() {
  const { isConnected, isInitialized } = useVlynkSocket();
  const { currentRoom, joinRoom, leaveRoom } = useChat();
  
  // 상태 관리
  const [currentUser, setCurrentUser] = useState<VlynkUser | null>(null);
  const [rooms, setRooms] = useState<VlynkRoom[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 로그인 처리
  const handleLogin = useCallback((user: VlynkUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    console.log('🔐 User logged in:', user);
  }, []);

  // 로그아웃 처리
  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setRooms([]);
    if (currentRoom) {
      leaveRoom();
    }
    console.log('🔐 User logged out');
  }, [currentRoom, leaveRoom]);

  // 방 선택 처리
  const handleRoomSelect = useCallback((room: VlynkRoom) => {
    const password = room.hasPassword && room.creator !== currentUser?.username 
      ? prompt(`방 "${room.name}"의 비밀번호를 입력하세요:`)
      : undefined;
    
    if (room.hasPassword && room.creator !== currentUser?.username && password === null) {
      return; // 사용자가 취소함
    }
    
    joinRoom(room, password);
  }, [currentUser, joinRoom]);

  // 방 생성 처리
  const handleCreateRoom = useCallback(() => {
    if (!currentUser || currentUser.role !== 'admin') return;

    const roomName = prompt('방 이름을 입력하세요:');
    if (!roomName?.trim()) return;

    const maxUsers = prompt('최대 인원 수를 입력하세요 (1-100):');
    const maxUsersNum = parseInt(maxUsers || '20');

    if (maxUsersNum < 1 || maxUsersNum > 100) {
      alert('올바른 인원 수를 입력하세요 (1-100)');
      return;
    }

    const usePassword = confirm('이 방에 비밀번호를 설정하시겠습니까?');
    const password = usePassword ? prompt('방 비밀번호를 입력하세요:') : null;

    if (usePassword && !password?.trim()) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    // TODO: 방 생성 API 호출
    console.log('🏠 Creating room:', { roomName, maxUsersNum, password });
  }, [currentUser]);

  // 로그인 필요 시 로그인 모달 표시
  if (!isAuthenticated || !currentUser) {
    return <LoginModal onLogin={handleLogin} />;
  }

  // 초기화 중일 때 로딩 표시
  if (!isInitialized) {
    return <VlynkLoading />;
  }

  return (
    <ErrorBoundary FallbackComponent={VlynkErrorBoundary}>
      <div className={styles.container}>
        {/* 연결 상태 표시 (우상단 고정) */}
        <ConnectionStatus showLatency={true} />

        {/* 사용자 패널 (좌상단 고정) */}
        <UserPanel
          user={currentUser}
          onLogout={handleLogout}
          onCreateRoom={currentUser.role === 'admin' ? handleCreateRoom : undefined}
        />

        {/* 메인 콘텐츠 */}
        <div className={styles.mainContent}>
          <Suspense fallback={<VlynkLoading />}>
            {currentRoom ? (
              <ChatRoom
                room={currentRoom}
                currentUser={currentUser}
                onLeaveRoom={leaveRoom}
              />
            ) : (
              <>
                <div className={styles.welcomeHeader}>
                  <h1>VLYNK NETWORK <span className={styles.blinkCursor}>▌</span></h1>
                  <div className={styles.welcomeSubtitle}>
                    Professional Talent Network & Communication Platform
                  </div>
                </div>
                
                <RoomGrid
                  rooms={rooms}
                  onRoomSelect={handleRoomSelect}
                  currentUser={currentUser}
                />
              </>
            )}
          </Suspense>
        </div>

        {/* CRT 스캔라인 효과 */}
        <div className={styles.crtScanlines} />
      </div>
    </ErrorBoundary>
  );
}