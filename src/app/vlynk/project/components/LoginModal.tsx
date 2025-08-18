// src/app/vlynk/project/components/LoginModal.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { LoginModalProps } from '../types/project.types';
import styles from '../project.module.css';

export default function LoginModal({ onLogin, isVisible }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 모달이 열릴 때 입력 필드에 포커스
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  // 로그인 처리
  const handleLogin = async () => {
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) {
      setError('사용자명을 입력해주세요.');
      return;
    }

    if (trimmedUsername.length < 2) {
      setError('사용자명은 2글자 이상이어야 합니다.');
      return;
    }

    if (trimmedUsername.length > 20) {
      setError('사용자명은 20글자를 초과할 수 없습니다.');
      return;
    }

    // 특수문자 검증 (영문, 숫자, 한글, 언더스코어만 허용)
    const validPattern = /^[a-zA-Z0-9가-힣_]+$/;
    if (!validPattern.test(trimmedUsername)) {
      setError('사용자명에는 특수문자를 사용할 수 없습니다.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 로그인 처리 (부모 컴포넌트로 전달)
      onLogin(trimmedUsername);
    } catch (err) {
      setError('로그인에 실패했습니다. 다시 시도해주세요.');
      setIsLoading(false);
    }
  };

  // Enter 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin();
    }
  };

  // 모달이 보이지 않을 때는 렌더링하지 않음
  if (!isVisible) return null;

  return (
    <div className={styles.loginModalOverlay}>
      <div className={styles.loginModalContainer}>
        {/* 헤더 */}
        <div className={styles.loginModalHeader}>
          <div className={styles.terminalTitle}>
            VLYNK MUSIC ACCESS TERMINAL
          </div>
          <div className={styles.terminalSubtitle}>
            ━━━ SECURE CONNECTION REQUIRED ━━━
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className={styles.loginModalContent}>
          <div className={styles.accessPrompt}>
            <div className={styles.promptLine}>
              <span className={styles.promptSymbol}>$</span>
              <span className={styles.promptText}>USER IDENTIFICATION REQUIRED</span>
            </div>
            <div className={styles.promptLine}>
              <span className={styles.promptSymbol}>$</span>
              <span className={styles.promptText}>ENTER CREDENTIALS TO PROCEED</span>
            </div>
          </div>

          {/* 입력 영역 */}
          <div className={styles.inputSection}>
            <div className={styles.inputLabel}>
              USERNAME:
            </div>
            <div className={styles.inputContainer}>
              <span className={styles.inputPrompt}>&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                className={styles.usernameInput}
                placeholder="Enter your username"
                maxLength={20}
                disabled={isLoading}
              />
              <span className={styles.cursor}>_</span>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className={styles.errorMessage}>
              <span className={styles.errorSymbol}>ERROR:</span>
              <span className={styles.errorText}>{error}</span>
            </div>
          )}

          {/* 버튼 영역 */}
          <div className={styles.buttonSection}>
            <button
              onClick={handleLogin}
              disabled={isLoading || !username.trim()}
              className={`${styles.loginButton} ${isLoading ? styles.loading : ''}`}
            >
              {isLoading ? (
                <>
                  <span className={styles.loadingDots}>CONNECTING</span>
                  <span className={styles.loadingAnimation}>...</span>
                </>
              ) : (
                'INITIALIZE CONNECTION'
              )}
            </button>
          </div>

          {/* 하단 정보 */}
          <div className={styles.loginModalFooter}>
            <div className={styles.systemInfo}>
              <div>SYSTEM: VLYNK v2.0.1</div>
              <div>STATUS: AWAITING AUTHENTICATION</div>
              <div>PROTOCOL: SOCKET.IO/WSS</div>
            </div>
          </div>
        </div>

        {/* 터미널 스캔라인 효과 */}
        <div className={styles.scanlines}></div>
      </div>
    </div>
  );
}