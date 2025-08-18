'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './LoginModal.module.css';

// ===== Props 타입 =====
interface LoginModalProps {
  onLogin: (username: string) => void;
  isVisible: boolean;
}

// ===== 메인 컴포넌트 =====
export default function LoginModal({ onLogin, isVisible }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 사용자명 검증 함수
  const validateUsername = (name: string): string | null => {
    if (!name.trim()) {
      return '사용자명을 입력해주세요.';
    }
    if (name.length < 2) {
      return '사용자명은 최소 2글자 이상이어야 합니다.';
    }
    if (name.length > 20) {
      return '사용자명은 최대 20글자까지 입력 가능합니다.';
    }
    if (!/^[a-zA-Z0-9가-힣_-]+$/.test(name)) {
      return '사용자명은 영문, 한글, 숫자, _, - 만 사용 가능합니다.';
    }
    return null;
  };

  // 로그인 처리 함수
  const handleLogin = async () => {
    const trimmedUsername = username.trim();
    const validationError = validateUsername(trimmedUsername);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // 로딩 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 사용자명 중복 체크 시뮬레이션 (나중에 실제 API로 교체)
      const reservedNames = ['admin', 'system', 'vlynk', 'root', 'test'];
      if (reservedNames.includes(trimmedUsername.toLowerCase())) {
        throw new Error('사용할 수 없는 사용자명입니다.');
      }

      // 웰컴 메시지 표시
      setShowWelcome(true);
      
      // 잠시 후 로그인 완료
      setTimeout(() => {
        onLogin(trimmedUsername);
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
      setIsLoading(false);
    }
  };

  // Enter 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin();
    }
  };

  // 모달이 표시될 때 input에 포커스
  useEffect(() => {
    if (isVisible && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);

  // 사용자명 변경시 에러 초기화
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [username, error]);

  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* 헤더 */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>🎵</div>
            <div className={styles.logoText}>
              <h1 className={styles.title}>VLYNK</h1>
              <p className={styles.subtitle}>Music Collaboration Platform</p>
            </div>
          </div>
          
          <div className={styles.version}>
            v2.0 BETA
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className={styles.content}>
          {!showWelcome ? (
            <>
              {/* 로그인 폼 */}
              <div className={styles.loginForm}>
                <h2 className={styles.formTitle}>음악실 입장</h2>
                <p className={styles.formDescription}>
                  실시간 음악 협업을 시작하려면<br />
                  사용자명을 입력해주세요
                </p>

                <div className={styles.inputSection}>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>👤</span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="사용자명 입력..."
                      className={styles.usernameInput}
                      disabled={isLoading}
                      maxLength={20}
                    />
                  </div>
                  
                  {error && (
                    <div className={styles.errorMessage}>
                      ⚠️ {error}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLogin}
                  disabled={isLoading || !username.trim()}
                  className={styles.loginButton}
                >
                  {isLoading ? (
                    <>
                      <div className={styles.spinner}></div>
                      연결 중...
                    </>
                  ) : (
                    <>
                      🚀 입장하기
                    </>
                  )}
                </button>
              </div>

              {/* 기능 소개 */}
              <div className={styles.features}>
                <h3 className={styles.featuresTitle}>✨ VLYNK 기능</h3>
                <div className={styles.featureList}>
                  <div className={styles.feature}>
                    <span className={styles.featureIcon}>🎵</span>
                    <span className={styles.featureText}>실시간 음악 동기화</span>
                  </div>
                  <div className={styles.feature}>
                    <span className={styles.featureIcon}>💬</span>
                    <span className={styles.featureText}>시간별 댓글 시스템</span>
                  </div>
                  <div className={styles.feature}>
                    <span className={styles.featureIcon}>🎤</span>
                    <span className={styles.featureText}>음성 메시지 지원</span>
                  </div>
                  <div className={styles.feature}>
                    <span className={styles.featureIcon}>👥</span>
                    <span className={styles.featureText}>다중 사용자 협업</span>
                  </div>
                  <div className={styles.feature}>
                    <span className={styles.featureIcon}>📊</span>
                    <span className={styles.featureText}>파형 시각화</span>
                  </div>
                  <div className={styles.feature}>
                    <span className={styles.featureIcon}>🏆</span>
                    <span className={styles.featureText}>사용자 뱃지 시스템</span>
                  </div>
                </div>
              </div>

              {/* 예시 사용자명 */}
              <div className={styles.examples}>
                <h4 className={styles.examplesTitle}>💡 사용자명 예시</h4>
                <div className={styles.exampleList}>
                  {['producer_alex', 'beat_master', 'lo_fi_girl', 'indie_rock', 'jazz_cat'].map((example) => (
                    <button
                      key={example}
                      onClick={() => setUsername(example)}
                      className={styles.exampleButton}
                      disabled={isLoading}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* 웰컴 메시지 */
            <div className={styles.welcomeScreen}>
              <div className={styles.welcomeIcon}>🎉</div>
              <h2 className={styles.welcomeTitle}>환영합니다!</h2>
              <p className={styles.welcomeMessage}>
                <strong>{username}</strong>님,<br />
                VLYNK 음악실에 입장하고 있습니다...
              </p>
              <div className={styles.welcomeSpinner}></div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className={styles.footer}>
          <div className={styles.footerText}>
            <span>🎵 Made with ❤️ for music creators</span>
          </div>
          <div className={styles.footerLinks}>
            <button className={styles.footerLink}>도움말</button>
            <button className={styles.footerLink}>개인정보처리방침</button>
          </div>
        </div>

        {/* 배경 효과 */}
        <div className={styles.backgroundEffects}>
          <div className={styles.musicNote1}>♪</div>
          <div className={styles.musicNote2}>♫</div>
          <div className={styles.musicNote3}>♪</div>
          <div className={styles.musicNote4}>♫</div>
        </div>
      </div>
    </div>
  );
}