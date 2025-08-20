'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import styles from './chatroom.module.css';
import { io, Socket } from 'socket.io-client';

interface Room {
  name: string;
  userCount: number;
  maxUsers?: number;
  hasPassword: boolean;
  creator: string;
  lastMessage?: string;
  lastMessageTime: number;
}

interface Message {
  id: string;
  user: string;
  message: string;
  timestamp: number;
  fileData?: {
    name: string;
    url: string;
    type: string;
  };
}

export default function ChatroomPage() {
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUser, setCurrentUser] = useState('');
  const [currentRoom, setCurrentRoom] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Socket 초기화
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    // Socket 이벤트 리스너들
    newSocket.on('room list', (roomList: Room[]) => {
      setRooms(roomList.sort((a, b) => a.name.localeCompare(b.name)));
    });

    newSocket.on('room join success', (data: any) => {
      setCurrentRoom(data.roomName);
      setIsInRoom(true);
      setMessages([]);
    });

    newSocket.on('room join error', (data: any) => {
      alert(data.message);
    });

    newSocket.on('chat message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('user joined room', (data: any) => {
      addSystemMessage(`${data.username} JOINED THE ROOM`);
    });

    newSocket.on('user left room', (data: any) => {
      addSystemMessage(`${data.username} LEFT THE ROOM`);
    });

    newSocket.on('room created', (data: any) => {
      addSystemMessage(`ROOM "${data.roomName}" CREATED`);
      loadRoomList();
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // 메시지 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addSystemMessage = (message: string) => {
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      user: 'SYSTEM',
      message,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const handleLogin = () => {
    if (username.trim() && socket) {
      setCurrentUser(username.trim());
      setShowLogin(false);
      socket.emit('user join', { username: username.trim() });
      loadRoomList();
    }
  };

  const loadRoomList = () => {
    if (socket) {
      socket.emit('get room list');
    }
  };

  const joinRoom = (roomName: string) => {
    if (socket && currentUser) {
      socket.emit('join room', { roomName });
    }
  };

  const createRoom = () => {
    const roomName = prompt('Enter room name:');
    const maxUsers = prompt('Maximum users (leave empty for unlimited):');
    const password = prompt('Password (leave empty for public room):');

    if (roomName && socket) {
      socket.emit('create room', {
        roomName: roomName.trim(),
        maxUsers: maxUsers ? parseInt(maxUsers) : null,
        password: password || null
      });
    }
  };

  const sendMessage = () => {
    if (!messageInput.trim() && !selectedFile) return;

    if (socket && currentUser && currentRoom) {
      const messageData: any = {
        roomName: currentRoom,
        message: messageInput.trim(),
        user: currentUser
      };

      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          messageData.fileData = {
            name: selectedFile.name,
            data: e.target?.result,
            type: selectedFile.type
          };
          socket.emit('chat message', messageData);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        socket.emit('chat message', messageData);
      }

      setMessageInput('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const leaveRoom = () => {
    if (socket && currentRoom) {
      socket.emit('leave room', { roomName: currentRoom });
      setIsInRoom(false);
      setCurrentRoom('');
      setMessages([]);
      loadRoomList();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  if (showLogin) {
    return (
      <>
        <Header />
        <div className={styles.loginModal}>
          <div className={styles.loginTerminal}>
            <div className={styles.loginTitle}>VLYNK CHAT ACCESS</div>
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
              ENTER CHAT
            </button>
          </div>
        </div>
      </>
    );
  }

  if (isInRoom) {
    return (
      <>
        <Header />
        <div className={styles.chatView}>
          <div className={styles.chatHeaderBar}>
            <div className={styles.roomInfo}>
              ROOM: {currentRoom} | USER: {currentUser}
            </div>
            <button className={styles.backBtn} onClick={leaveRoom}>
              LEAVE ROOM
            </button>
          </div>

          <div className={styles.chatArea}>
            <div className={styles.messagesContainer}>
              {messages.map((msg) => (
                <div key={msg.id} className={styles.message}>
                  {msg.user === 'SYSTEM' ? (
                    <div className={styles.systemMessage}>
                      {">>>"} {msg.message}
                    </div>
                  ) : (
                    <div className={styles.userMessage}>
                      <span className={styles.username}>{msg.user}:</span>{' '}
                      <span className={styles.messageText}>{msg.message}</span>
                      {msg.fileData && (
                        <div className={styles.fileAttachment}>
                          📎 {msg.fileData.name}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
              <div className={styles.fileUploadSection}>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <button
                  className={styles.fileBtn}
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁
                </button>
                {selectedFile && (
                  <span className={styles.filePreview}>
                    {selectedFile.name}
                  </span>
                )}
              </div>
              
              <input
                type="text"
                className={styles.messageInput}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
              />
              
              <button className={styles.sendButton} onClick={sendMessage}>
                SEND
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.chatroomContainer}>
        <div className={styles.userInfo}>
          USER: <span>{currentUser}</span>
        </div>

        <div className={styles.createSection}>
          <button className={styles.createRoomBtn} onClick={createRoom}>
            + CREATE ROOM
          </button>
        </div>

        <div className={styles.mainContainer}>
          <div className={styles.chatHeader}>
            <h1>VLYNK CHAT ROOMS <span className={styles.cursor}>▌</span></h1>
          </div>

          <div className={styles.chatHub}>
            <div className={styles.chatColumn}>
              {rooms
                .filter((_, index) => index % 2 === 0)
                .map((room) => (
                  <div
                    key={room.name}
                    className={styles.chatRoom}
                    onClick={() => joinRoom(room.name)}
                  >
                    <span className={styles.chatTitle}>
                      {room.name}
                      {room.hasPassword && ' 🔒'}
                    </span>
                    <span className={styles.chatTime}>
                      {getTimeAgo(room.lastMessageTime)}
                    </span>
                    <div className={styles.preview}>
                      Users: {room.userCount}
                      {room.maxUsers && `/${room.maxUsers}`}
                      {room.lastMessage && (
                        <div>Last: {room.lastMessage}</div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
            
            <div className={styles.chatColumn}>
              {rooms
                .filter((_, index) => index % 2 === 1)
                .map((room) => (
                  <div
                    key={room.name}
                    className={styles.chatRoom}
                    onClick={() => joinRoom(room.name)}
                  >
                    <span className={styles.chatTitle}>
                      {room.name}
                      {room.hasPassword && ' 🔒'}
                    </span>
                    <span className={styles.chatTime}>
                      {getTimeAgo(room.lastMessageTime)}
                    </span>
                    <div className={styles.preview}>
                      Users: {room.userCount}
                      {room.maxUsers && `/${room.maxUsers}`}
                      {room.lastMessage && (
                        <div>Last: {room.lastMessage}</div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}