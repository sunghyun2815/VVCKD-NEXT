// src/app/vlynk/project/components/ChatSystem.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, User } from '../types/project.types';
import styles from '../chatsystem.module.css';

interface ChatSystemProps {
  messages: ChatMessage[];
  currentUser: string;
  connectedUsers: User[];
  currentTime: number;
  onSendMessage: (message: string, timestamp?: number) => void;
  onVoiceMessage: (audioBlob: Blob) => void;
  isRecording: boolean;
  onRecordingChange: (recording: boolean) => void;
}

export default function ChatSystem({
  messages,
  currentUser,
  connectedUsers,
  currentTime,
  onSendMessage,
  onVoiceMessage,
  isRecording,
  onRecordingChange
}: ChatSystemProps) {
  const [messageInput, setMessageInput] = useState('');
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 메시지 자동 스크롤
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 오디오 권한 확인
  useEffect(() => {
    const checkAudioPermission = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioPermission(true);
      } catch (error) {
        console.warn('Audio permission denied:', error);
        setAudioPermission(false);
      }
    };

    checkAudioPermission();
  }, []);

  // 텍스트 메시지 전송
  const handleSendMessage = () => {
    const trimmedMessage = messageInput.trim();
    if (!trimmedMessage) return;

    const timestamp = showTimestamp ? currentTime : undefined;
    onSendMessage(trimmedMessage, timestamp);
    setMessageInput('');
    
    // 포커스 유지
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  // Enter 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 음성 녹음 시작
  const startRecording = async () => {
    if (!audioPermission) {
      alert('마이크 권한이 필요합니다.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        onVoiceMessage(audioBlob);
        
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      onRecordingChange(true);
      setRecordingTime(0);

      // 녹음 시간 타이머
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Recording failed:', error);
      alert('녹음을 시작할 수 없습니다.');
    }
  };

  // 음성 녹음 중지
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    setMediaRecorder(null);
    onRecordingChange(false);
    setRecordingTime(0);
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // 시간 포맷팅
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 메시지 시간 포맷팅
  const formatMessageTime = (timestamp: number): string => {
    return formatTime(timestamp);
  };

  // 메시지 그룹핑 (같은 사용자의 연속 메시지)
  const groupedMessages = messages.reduce((groups, message, index) => {
    const prevMessage = messages[index - 1];
    const isNewGroup = !prevMessage || 
                      prevMessage.user !== message.user ||
                      (new Date(message.time).getTime() - new Date(prevMessage.time).getTime()) > 300000; // 5분

    if (isNewGroup) {
      groups.push([message]);
    } else {
      groups[groups.length - 1].push(message);
    }

    return groups;
  }, [] as ChatMessage[][]);

  return (
    <div className={styles.chatContainer}>
      {/* 채팅 헤더 */}
      <div className={styles.chatHeader}>
        <div className={styles.chatTitle}>
          LIVE CHAT
        </div>
        <div className={styles.chatStats}>
          <span>👥 {connectedUsers.length}</span>
          <span>💬 {messages.length}</span>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className={styles.messagesContainer}>
        {groupedMessages.length === 0 ? (
          <div className={styles.emptyChat}>
            <div className={styles.emptyChatIcon}>💭</div>
            <div className={styles.emptyChatText}>
              No messages yet.<br />
              Start the conversation!
            </div>
          </div>
        ) : (
          groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex} className={styles.messageGroup}>
              <div className={styles.messageGroupHeader}>
                <span className={styles.messageUser}>
                  {group[0].user}
                  {group[0].user === currentUser && (
                    <span className={styles.youIndicator}> (you)</span>
                  )}
                </span>
                <span className={styles.messageDate}>
                  {new Date(group[0].time).toLocaleTimeString()}
                </span>
              </div>
              
              {group.map((message) => (
                <div 
                  key={message.id} 
                  className={`${styles.messageItem} ${
                    message.user === currentUser ? styles.ownMessage : ''
                  }`}
                >
                  <div className={styles.messageContent}>
                    {message.type === 'voice' ? (
                      <div className={styles.voiceMessage}>
                        <span className={styles.voiceIcon}>🎤</span>
                        <audio 
                          controls 
                          className={styles.audioPlayer}
                          src={message.audioUrl}
                        />
                      </div>
                    ) : (
                      <div className={styles.textMessage}>
                        {message.message}
                      </div>
                    )}
                  </div>
                  
                  {message.timestamp !== undefined && (
                    <div className={styles.messageTimestamp}>
                      📍 {formatMessageTime(message.timestamp)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className={styles.inputArea}>
        {/* 타임스탬프 토글 */}
        <div className={styles.inputOptions}>
          <label className={styles.timestampToggle}>
            <input
              type="checkbox"
              checked={showTimestamp}
              onChange={(e) => setShowTimestamp(e.target.checked)}
            />
            <span className={styles.checkboxCustom}></span>
            <span className={styles.timestampLabel}>
              Add timestamp ({formatTime(currentTime)})
            </span>
          </label>
        </div>

        {/* 메시지 입력 */}
        <div className={styles.messageInputContainer}>
          <input
            ref={inputRef}
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isRecording ? "Recording..." : "Type a message..."}
            className={styles.messageInput}
            disabled={isRecording}
            maxLength={500}
          />
          
          {/* 음성 녹음 버튼 */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`${styles.voiceBtn} ${isRecording ? styles.recording : ''}`}
            disabled={!audioPermission}
            title={isRecording ? "Stop recording" : "Start voice recording"}
          >
            {isRecording ? (
              <span className={styles.recordingIndicator}>
                🔴 {recordingTime}s
              </span>
            ) : (
              '🎤'
            )}
          </button>
          
          {/* 전송 버튼 */}
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || isRecording}
            className={styles.sendBtn}
          >
            📤
          </button>
        </div>

        {/* 녹음 상태 표시 */}
        {isRecording && (
          <div className={styles.recordingStatus}>
            <div className={styles.recordingWave}>
              {Array.from({ length: 5 }, (_, i) => (
                <div 
                  key={i} 
                  className={styles.recordingBar}
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <span>Recording voice message... Click 🔴 to stop</span>
          </div>
        )}

        {/* 오디오 권한 알림 */}
        {audioPermission === false && (
          <div className={styles.permissionWarning}>
            ⚠️ Microphone access is required for voice messages
          </div>
        )}
      </div>
    </div>
  );
}