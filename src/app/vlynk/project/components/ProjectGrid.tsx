'use client';
import React, { useState, useCallback } from 'react';
import type { ProjectGridProps, MusicRoom } from '../types/project.types';
import styles from '../project.module.css';

export default function ProjectGrid({
  rooms,
  onJoinRoom,
  onCreateRoom,
  onViewRoomInfo,
  currentUser,
  isLoading = false
}: ProjectGridProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // 룸 생성 핸들러
  const handleCreateRoom = useCallback(() => {
    if (!currentUser || currentUser === 'GUEST') {
      alert('먼저 로그인해주세요.');
      return;
    }

    const roomName = prompt('음악 룸 이름을 입력하세요:');
    if (!roomName) return;

    if (roomName.length < 2) {
      alert('룸 이름은 2글자 이상이어야 합니다.');
      return;
    }

    if (roomName.length > 50) {
      alert('룸 이름은 50글자 이하여야 합니다.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      onCreateRoom(roomName.trim());
      console.log('🏠 Creating room:', roomName);
    } catch (error) {
      setCreateError('룸 생성 중 오류가 발생했습니다.');
      console.error('❌ Room creation error:', error);
    } finally {
      // 실제로는 서버 응답을 기다려야 하지만, 여기서는 간단히 처리
      setTimeout(() => {
        setIsCreating(false);
      }, 1000);
    }
  }, [currentUser, onCreateRoom]);

  // 룸 입장 핸들러
  const handleJoinRoom = useCallback((roomId: string) => {
    if (!currentUser || currentUser === 'GUEST') {
      alert('먼저 로그인해주세요.');
      return;
    }

    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      alert('존재하지 않는 룸입니다.');
      return;
    }

    if (room.participants >= room.maxUsers) {
      alert('룸이 가득 찼습니다.');
      return;
    }

    console.log('🚪 Joining room:', room.name);
    onJoinRoom(roomId);
  }, [currentUser, rooms, onJoinRoom]);

  // 룸 정보 보기 핸들러
  const handleViewRoomInfo = useCallback((roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const info = `
        룸 이름: ${room.name}
        설명: ${room.description}
        참가자: ${room.participants}/${room.maxUsers}명
        음악 트랙: ${room.musicCount}개
        상태: ${room.status.toUpperCase()}
        장르: ${room.genres.join(', ')}
        생성일: ${new Date(room.createdAt).toLocaleDateString()}
    `.trim();

    alert(info);
    onViewRoomInfo(roomId);
  }, [rooms, onViewRoomInfo]);

  // 룸 상태별 스타일 클래스
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active': return styles.statusActive;
      case 'development': return styles.statusDevelopment;
      case 'planning': return styles.statusPlanning;
      default: return styles.statusActive;
    }
  };

  // 룸 상태별 이모지
  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'development': return '🟡';
      case 'planning': return '🔴';
      default: return '🟢';
    }
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className={styles.mainContainer}>
        <div className={styles.projectHeader}>
          <h1 className={styles.projectHeaderTitle}>
            VVCKD MUSIC ROOMS <span className={styles.cursor}>▌</span>
          </h1>
          <div className={styles.projectSubtitle}>ENHANCED COLLABORATIVE MUSIC WORKSPACE</div>
        </div>
        
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          Loading music rooms...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mainContainer}>
      {/* 헤더 */}
      <div className={styles.projectHeader}>
        <h1 className={styles.projectHeaderTitle}>
          VVCKD MUSIC ROOMS <span className={styles.cursor}>▌</span>
        </h1>
        <div className={styles.projectSubtitle}>ENHANCED COLLABORATIVE MUSIC WORKSPACE</div>
      </div>

      {/* 룸 생성 섹션 */}
      <div className={styles.addProjectSection}>
        <h3 className={styles.addProjectSectionTitle}>CREATE MUSIC ROOM</h3>
        
        {createError && (
          <div className={styles.error} style={{ marginBottom: '15px', padding: '10px' }}>
            ⚠️ {createError}
          </div>
        )}
        
        <button
          className={styles.addBtn}
          onClick={handleCreateRoom}
          disabled={isCreating || !currentUser || currentUser === 'GUEST'}
        >
          {isCreating ? (
            <>
              <span className={styles.loadingSpinner} style={{ marginRight: '10px' }}></span>
              CREATING...
            </>
          ) : (
            '+ CREATE ROOM'
          )}
        </button>
        
        {(!currentUser || currentUser === 'GUEST') && (
          <div style={{ marginTop: '10px', fontSize: '8px', color: '#666' }}>
            로그인 후 룸을 생성할 수 있습니다.
          </div>
        )}
      </div>

      {/* 룸 목록 */}
      {rooms.length === 0 ? (
        <div className={styles.projectGrid}>
          <div className={styles.projectCard} style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ color: '#888', marginBottom: '20px', fontSize: '12px' }}>
              📭 No rooms available
            </div>
            <div style={{ color: '#666', fontSize: '8px', marginBottom: '15px' }}>
              Create the first music room to get started!
            </div>
            <button className={styles.projectBtn} disabled>
              EMPTY
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.projectGrid}>
          {rooms.map((room) => (
            <div key={room.id} className={styles.projectCard}>
              {/* 스캔 애니메이션 효과는 CSS에서 처리 */}
              
              {/* 룸 제목 및 상태 */}
              <div className={styles.projectTitle}>
                <span>{room.name}</span>
                <span className={`${styles.projectStatus} ${getStatusClass(room.status)}`}>
                  {getStatusEmoji(room.status)} {room.status.toUpperCase()}
                </span>
              </div>

              {/* 룸 정보 */}
              <div className={styles.projectInfo}>
                <span className={styles.projectParticipants}>
                  👥 {room.participants}/{room.maxUsers} users
                </span>
                <span className={styles.projectMusicCount}>
                  🎵 {room.musicCount} tracks
                </span>
              </div>

              {/* 룸 설명 */}
              <div className={styles.projectDescription}>
                {room.description}
              </div>

              {/* 기술 태그 */}
              <div className={styles.projectTech}>
                <span className={styles.techTag}>AUDIO</span>
                <span className={styles.techTag}>COLLABORATION</span>
                <span className={styles.techTag}>REAL-TIME</span>
                <span className={styles.techTag}>VOICE MEMO</span>
                {room.genres.slice(0, 2).map((genre) => (
                  <span key={genre} className={styles.techTag}>
                    {genre.toUpperCase()}
                  </span>
                ))}
              </div>

              {/* 액션 버튼들 */}
              <div className={styles.projectLinks}>
                <button
                  className={`${styles.projectBtn} ${styles.join}`}
                  onClick={() => handleJoinRoom(room.id)}
                  disabled={
                    !currentUser || 
                    currentUser === 'GUEST' || 
                    room.participants >= room.maxUsers
                  }
                >
                  {room.participants >= room.maxUsers ? '🔒 FULL' : '🚪 JOIN ROOM'}
                </button>
                
                <button
                  className={styles.projectBtn}
                  onClick={() => handleViewRoomInfo(room.id)}
                >
                  ℹ️ VIEW INFO
                </button>
                
                {room.status === 'active' && (
                  <button
                    className={styles.projectBtn}
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={!currentUser || currentUser === 'GUEST'}
                  >
                    🎵 QUICK JOIN
                  </button>
                )}
              </div>

              {/* 추가 정보 (호버 시 표시될 수 있음) */}
              <div style={{ 
                fontSize: '7px', 
                color: '#666', 
                marginTop: '10px',
                borderTop: '1px solid #333',
                paddingTop: '8px'
              }}>
                Created: {new Date(room.createdAt).toLocaleDateString()}
                {room.createdBy && ` by ${room.createdBy}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 통계 정보 */}
      {rooms.length > 0 && (
        <div style={{
          textAlign: 'center',
          marginTop: '30px',
          padding: '20px',
          border: '1px solid #333',
          background: 'rgba(255, 85, 0, 0.05)'
        }}>
          <div style={{ color: '#FF5500', fontSize: '10px', marginBottom: '10px' }}>
            📊 ROOM STATISTICS
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '30px', 
            flexWrap: 'wrap',
            fontSize: '8px'
          }}>
            <span style={{ color: '#00FF00' }}>
              ✅ Total Rooms: {rooms.length}
            </span>
            <span style={{ color: '#FFFF00' }}>
              👥 Total Users: {rooms.reduce((sum, room) => sum + room.participants, 0)}
            </span>
            <span style={{ color: '#FF5500' }}>
              🎵 Total Tracks: {rooms.reduce((sum, room) => sum + room.musicCount, 0)}
            </span>
            <span style={{ color: '#00FF00' }}>
              🟢 Active: {rooms.filter(r => r.status === 'active').length}
            </span>
          </div>
        </div>
      )}

      {/* 도움말 정보 */}
      <div style={{
        textAlign: 'center',
        marginTop: '20px',
        fontSize: '7px',
        color: '#666',
        padding: '15px'
      }}>
        💡 TIP: Click "JOIN ROOM" to enter a collaborative music workspace.<br/>
        🎤 Upload audio files, leave voice comments, and collaborate in real-time!
      </div>
    </div>
  );
}

// src/app/vlynk/project/components/ProjectGrid.module.css (선택사항 - 추가 스타일)
// 기본적으로는 project.module.css의 스타일을 사용하지만, 
// ProjectGrid만의 특별한 스타일이 필요하다면 여기에 추가

/*
.projectGridContainer {
  // ProjectGrid만의 특별한 스타일
}

.roomCardEnhanced {
  // 향상된 룸 카드 스타일
}

.statisticsPanel {
  // 통계 패널 스타일
}
*/