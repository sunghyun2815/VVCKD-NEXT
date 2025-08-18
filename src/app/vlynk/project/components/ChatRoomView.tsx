// src/app/vlynk/project/components/ChatRoomView.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage, User } from '../types/project.types';
import styles from './ChatRoomView.module.css';

// ===== Props 타입 =====
interface ChatRoomViewProps {
  currentUser: string;
  onLeaveRoom: () => void;
  socket?: any; // Socket.IO 인스턴스
}

// ===== 메인 컴포넌트 =====
export default function ChatRoomView({
  currentUser,
  onLeaveRoom,
  socket
}: ChatRoomViewProps) {
  // ===== 상태 관리 =====
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([
    {
      id: 'user-1',
      username: currentUser,
      role: 'user',
      joinedAt: new Date().toISOString()
    }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [currentChannel, setCurrentChannel] = useState('general');

  // ===== Refs =====
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // ===== 채널 목록 =====
  const chatChannels = [
    { id: 'general', name: 'General', description: '자유로운 채팅' },
    { id: 'music-talk', name: 'Music Talk', description: '음악 이야기' },
    { id: 'feedback', name: 'Feedback', description: '피드백 및 조언' },
    { id: 'random', name: 'Random', description: '랜덤 대화' }
  ];

  // ===== 채팅 함수들 =====
  const handleSendMessage = useCallback((message: string) => {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      roomId: currentChannel,
      user: currentUser,
      message: message.trim(),
      timestamp: 0, // 채팅룸에서는 타임스탬프 불필요
      time: new Date().toISOString(),
      type: 'text'
    };

    setChatMessages(prev => [...prev, newMessage]);
    
    // Socket.IO로 메시지 전송
    if (socket) {
      socket.emit('chat_message', newMessage);
    }

    // 메시지 입력 필드 초기화
    if (messageInputRef.current) {
      messageInputRef.current.value = '';
    }
  }, [currentChannel, currentUser, socket]);

  const handleVoiceMessage = useCallback(async () => {
    if (isRecording) {
      // 녹음 중지
      setIsRecording(false);
      
      const voiceMessage: ChatMessage = {
        id: `voice-${Date.now()}`,
        roomId: currentChannel,
        user: currentUser,
        message: '[Voice Message]',
        timestamp: 0,
        time: new Date().toISOString(),
        type: 'voice',
        audioUrl: '#' // 실제로는 녹음된 오디오 URL
      };

      setChatMessages(prev => [...prev, voiceMessage]);
      
      if (socket) {
        socket.emit('voice_message', voiceMessage);
      }
    } else {
      // 녹음 시작
      setIsRecording(true);
      console.log('🎤 음성 녹음 시작');
    }
  }, [isRecording, currentChannel, currentUser, socket]);

  // ===== 채널 전환 =====
  const handleChannelChange = useCallback((channelId: string) => {
    setCurrentChannel(channelId);
    setChatMessages([]); // 채널 전환 시 메시지 초기화 (실제로는 서버에서 로드)
    console.log(`📺 채널 전환: ${channelId}`);
  }, []);

  // ===== 효과들 =====

  // Socket.IO 이벤트 리스너
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
    };

    const handleVoiceMessage = (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
    };

    const handleUserJoined = (user: User) => {
      setConnectedUsers(prev => [...prev, user]);
      
      // 시스템 메시지 추가
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        roomId: currentChannel,
        user: 'SYSTEM',
        message: `${user.username}님이 입장했습니다.`,
        timestamp: 0,
        time: new Date().toISOString(),
        type: 'system'
      };
      setChatMessages(prev => [...prev, systemMessage]);
    };

    const handleUserLeft = (userId: string) => {
      const leavingUser = connectedUsers.find(u => u.id === userId);
      setConnectedUsers(prev => prev.filter(u => u.id !== userId));
      
      if (leavingUser) {
        const systemMessage: ChatMessage = {
          id: `system-${Date.now()}`,
          roomId: currentChannel,
          user: 'SYSTEM',
          message: `${leavingUser.username}님이 퇴장했습니다.`,
          timestamp: 0,
          time: new Date().toISOString(),
          type: 'system'
        };
        setChatMessages(prev => [...prev, systemMessage]);
      }
    };

    socket.on('chat_message', handleChatMessage);
    socket.on('voice_message', handleVoiceMessage);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);

    return () => {
      socket.off('chat_message', handleChatMessage);
      socket.off('voice_message', handleVoiceMessage);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
    };
  }, [socket, currentChannel, connectedUsers]);

  // 채팅 자동 스크롤
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // 컴포넌트 마운트 시 환영 메시지
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      roomId: currentChannel,
      user: 'SYSTEM',
      message: `VLYNK 채팅룸에 오신 것을 환영합니다! 🎵`,
      timestamp: 0,
      time: new Date().toISOString(),
      type: 'system'
    };
    setChatMessages([welcomeMessage]);
  }, [currentChannel]);

  // ===== 포맷팅 함수들 =====
  const formatTime = (timeString: string): string => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getUserRoleColor = (role: string): string => {
    switch (role) {
      case 'admin': return '#FF0000';
      case 'moderator': return '#FFAA00';
      case 'user': return '#00FF00';
      default: return '#666';
    }
  };

  // ===== 렌더링 =====
  return (
    <div className={styles.chatRoomContainer}>
      {/* 채팅룸 헤더 */}
      <header className={styles.chatHeader}>
        <div className={styles.roomInfo}>
          <h1 className={styles.roomTitle}>💬 VLYNK Chat</h1>
          <div className={styles.roomMeta}>
            <span className={styles.channelName}>
              #{chatChannels.find(c => c.id === currentChannel)?.name}
            </span>
            <span className={styles.userCount}>
              👥 {connectedUsers.length}명 접속중
            </span>
          </div>
        </div>
        
        <div className={styles.roomControls}>
          <button
            onClick={onLeaveRoom}
            className={styles.leaveBtn}
          >
            ← 로비로
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className={styles.mainContent}>
        {/* 왼쪽: 채널 목록 & 사용자 목록 */}
        <aside className={styles.sidebar}>
          {/* 채널 목록 */}
          <section className={styles.channelSection}>
            <h3 className={styles.sectionTitle}>📺 채널</h3>
            <div className={styles.channelList}>
              {chatChannels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelChange(channel.id)}
                  className={`${styles.channelItem} ${
                    currentChannel === channel.id ? styles.active : ''
                  }`}
                >
                  <div className={styles.channelName}>#{channel.name}</div>
                  <div className={styles.channelDesc}>{channel.description}</div>
                </button>
              ))}
            </div>
          </section>

          {/* 사용자 목록 */}
          <section className={styles.userSection}>
            <h3 className={styles.sectionTitle}>👥 사용자 ({connectedUsers.length})</h3>
            <div className={styles.userList}>
              {connectedUsers.map(user => (
                <div key={user.id} className={styles.userItem}>
                  <div className={styles.userStatus}>
                    <span className={styles.statusDot}></span>
                  </div>
                  <div className={styles.userInfo}>
                    <span 
                      className={styles.userName}
                      style={{ color: getUserRoleColor(user.role) }}
                    >
                      {user.username}
                    </span>
                    <span className={styles.userRole}>
                      {user.role === 'admin' ? '👑' : user.role === 'moderator' ? '🛡️' : '👤'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* 오른쪽: 채팅 영역 */}
        <section className={styles.chatSection}>
          {/* 채팅 메시지 영역 */}
          <div 
            ref={chatContainerRef}
            className={styles.chatMessages}
          >
            {chatMessages.map(message => (
              <div
                key={message.id}
                className={`${styles.messageItem} ${
                  message.type === 'system' ? styles.systemMessage : ''
                } ${
                  message.user === currentUser ? styles.ownMessage : ''
                }`}
              >
                {message.type !== 'system' && (
                  <div className={styles.messageHeader}>
                    <span 
                      className={styles.messageUser}
                      style={{ 
                        color: getUserRoleColor(
                          connectedUsers.find(u => u.username === message.user)?.role || 'user'
                        ) 
                      }}
                    >
                      {message.user}
                    </span>
                    <span className={styles.messageTime}>
                      {formatTime(message.time)}
                    </span>
                  </div>
                )}
                
                <div className={styles.messageContent}>
                  {message.type === 'voice' ? (
                    <div className={styles.voiceMessage}>
                      🎤 음성 메시지
                      {message.audioUrl && message.audioUrl !== '#' && (
                        <audio controls src={message.audioUrl} className={styles.audioPlayer} />
                      )}
                    </div>
                  ) : (
                    message.message
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 메시지 입력 영역 */}
          <div className={styles.messageInput}>
            <div className={styles.inputContainer}>
              <input
                ref={messageInputRef}
                type="text"
                placeholder={`#${chatChannels.find(c => c.id === currentChannel)?.name}에 메시지 입력...`}
                className={styles.textInput}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage(e.currentTarget.value);
                  }
                }}
                disabled={isRecording}
              />
              
              <div className={styles.inputActions}>
                <button
                  onClick={handleVoiceMessage}
                  className={`${styles.voiceBtn} ${isRecording ? styles.recording : ''}`}
                  title={isRecording ? '녹음 중지' : '음성 메시지'}
                >
                  {isRecording ? '🛑' : '🎤'}
                </button>
                
                <button
                  onClick={() => {
                    if (messageInputRef.current) {
                      handleSendMessage(messageInputRef.current.value);
                    }
                  }}
                  className={styles.sendBtn}
                  disabled={isRecording}
                >
                  📤
                </button>
              </div>
            </div>
            
            {isRecording && (
              <div className={styles.recordingIndicator}>
                <span className={styles.recordingDot}></span>
                <span>음성 메시지 녹음 중...</span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}