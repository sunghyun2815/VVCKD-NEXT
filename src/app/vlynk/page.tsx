'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './vlynk.module.css';

export default function VlynkPage() {
  const [terminalText, setTerminalText] = useState('');
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  // 터미널 텍스트 라인들
  const terminalLines = [
    '> VLYNK 시스템 부팅 중...',
    '> 음악 협업 엔진 로딩...',
    '> 실시간 동기화 프로토콜 활성화...',
    '> 사용자 인증 시스템 준비...',
    '> 오디오 처리 모듈 초기화...',
    '> 채팅 시스템 온라인...',
    '> 파일 업로드 서비스 준비 완료...',
    '',
    '=== VLYNK 시스템 준비 완료 ===',
    '',
    '환영합니다, VLYNK에 오신 것을!',
    '',
    '실시간 음악 협업 플랫폼',
    '- 함께 음악을 만들어보세요',
    '- 실시간으로 소통하고 공유하세요',
    '- 여러분의 창작물을 세상에 알리세요',
    '',
    '👆 위의 VLYNK 버튼을 클릭하여',
    '음악실에 입장하세요!'
  ];

  // 터미널 타이핑 애니메이션
  useEffect(() => {
    if (currentLineIndex < terminalLines.length) {
      const timer = setTimeout(() => {
        setTerminalText(prev => prev + terminalLines[currentLineIndex] + '\n');
        setCurrentLineIndex(prev => prev + 1);
      }, currentLineIndex === 0 ? 500 : 600);

      return () => clearTimeout(timer);
    }
  }, [currentLineIndex, terminalLines]);

  // 커서 깜박임 효과
  useEffect(() => {
    const cursorTimer = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 600);

    return () => clearInterval(cursorTimer);
  }, []);

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>VLYNK</h1>
          <p className={styles.headerSubtitle}>Real-time Music Collaboration Platform</p>
        </div>
        
        <nav className={styles.navigation}>
          <Link href="/vcktor" className={styles.navItem}>
            VCKTOR
          </Link>
          <Link href="/vlyssa" className={styles.navItem}>
            VLYSSA
            <div className={styles.loadingIndicator}></div>
          </Link>
          <Link href="/vlynk/project" className={`${styles.navItem} ${styles.navItemActive}`}>
            VLYNK
          </Link>
        </nav>
      </header>

      {/* 메인 콘텐츠 */}
      <main className={styles.main}>
        <div className={styles.contentArea}>
          <div className={styles.splitLayout}>
            {/* 왼쪽: 터미널 */}
            <section className={styles.terminalSection}>
              <div className={styles.terminal}>
                <div className={styles.terminalHeader}>
                  <span className={styles.terminalTitle}>VLYNK Terminal v2.0</span>
                  <div className={styles.terminalControls}>
                    <span className={styles.terminalButton}></span>
                    <span className={styles.terminalButton}></span>
                    <span className={styles.terminalButton}></span>
                  </div>
                </div>
                
                <div className={styles.terminalBody}>
                  <pre className={styles.terminalContent}>
                    {terminalText}
                    {currentLineIndex >= terminalLines.length && (
                      <span className={`${styles.cursor} ${showCursor ? styles.visible : styles.hidden}`}>█</span>
                    )}
                  </pre>
                </div>
              </div>
            </section>

            {/* 오른쪽: 소개 및 기능 */}
            <section className={styles.introSection}>
              <div className={styles.introContent}>
                {/* 메인 타이틀 */}
                <div className={styles.mainTitle}>
                  <h2 className={styles.vlynkTitle}>
                    <span className={styles.glitchText}>VLYNK</span>
                  </h2>
                  <p className={styles.tagline}>
                    음악으로 연결되는 세상
                  </p>
                </div>

                {/* 기능 소개 */}
                <div className={styles.features}>
                  <div className={styles.feature}>
                    <div className={styles.featureIcon}>🎵</div>
                    <div className={styles.featureContent}>
                      <h3>실시간 협업</h3>
                      <p>여러 사용자가 동시에 음악을 듣고 토론할 수 있습니다</p>
                    </div>
                  </div>

                  <div className={styles.feature}>
                    <div className={styles.featureIcon}>💬</div>
                    <div className={styles.featureContent}>
                      <h3>시간별 댓글</h3>
                      <p>음악의 특정 시점에 댓글을 달아 세밀한 피드백 제공</p>
                    </div>
                  </div>

                  <div className={styles.feature}>
                    <div className={styles.featureIcon}>🎤</div>
                    <div className={styles.featureContent}>
                      <h3>음성 메시지</h3>
                      <p>텍스트로 표현하기 어려운 감정을 음성으로 전달</p>
                    </div>
                  </div>

                  <div className={styles.feature}>
                    <div className={styles.featureIcon}>📊</div>
                    <div className={styles.featureContent}>
                      <h3>파형 시각화</h3>
                      <p>음악의 웨이브폼을 시각적으로 보며 정확한 소통</p>
                    </div>
                  </div>

                  <div className={styles.feature}>
                    <div className={styles.featureIcon}>🏆</div>
                    <div className={styles.featureContent}>
                      <h3>사용자 시스템</h3>
                      <p>프로필, 뱃지, 통계로 나만의 음악 이력 관리</p>
                    </div>
                  </div>

                  <div className={styles.feature}>
                    <div className={styles.featureIcon}>🔐</div>
                    <div className={styles.featureContent}>
                      <h3>권한 관리</h3>
                      <p>룸별 역할과 권한으로 체계적인 프로젝트 관리</p>
                    </div>
                  </div>
                </div>

                {/* 입장 버튼 */}
                <div className={styles.actionSection}>
                  <Link href="/vlynk/project" className={styles.enterButton}>
                    🎵 음악실 입장하기
                  </Link>
                  
                  <div className={styles.quickStats}>
                    <div className={styles.stat}>
                      <span className={styles.statNumber}>12</span>
                      <span className={styles.statLabel}>활성 룸</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statNumber}>47</span>
                      <span className={styles.statLabel}>온라인 사용자</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statNumber}>234</span>
                      <span className={styles.statLabel}>공유 트랙</span>
                    </div>
                  </div>
                </div>

                {/* 데모 링크 */}
                <div className={styles.demoSection}>
                  <h4>시스템 체험하기</h4>
                  <div className={styles.demoLinks}>
                    <Link href="/vlynk/demo/socket" className={styles.demoLink}>
                      🔌 Socket.IO 연결 테스트
                    </Link>
                    <Link href="/vlynk/demo/user" className={styles.demoLink}>
                      👤 사용자 시스템 데모
                    </Link>
                    <Link href="/vlynk/demo/audio" className={styles.demoLink}>
                      🎵 오디오 플레이어 데모
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* 배경 효과 */}
      <div className={styles.backgroundEffects}>
        <div className={styles.scanline}></div>
        <div className={styles.noise}></div>
      </div>
    </div>
  );
}