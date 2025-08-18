// src/app/vlynk/project/components/ProjectGrid.tsx
'use client';

import React, { useState } from 'react';
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
  const [newRoomName, setNewRoomName] = useState('');

  // 방 생성 핸들러
  const handleCreateRoom = () => {
    if (newRoomName.trim().length < 2) {
      alert('방 이름은 2글자 이상이어야 합니다.');
      return;
    }
    
    onCreateRoom(newRoomName.trim());
    setNewRoomName('');
    setIsCreating(false);
  };

  // 방 상태에 따른 스타일 클래스
  const getRoomStatusClass = (status: string) => {
    switch (status) {
      case 'active': return styles.statusActive;
      case 'development': return styles.statusDevelopment;
      case 'planning': return styles.statusPlanning;
      default: return '';
    }
  };

  // 방 상태 표시 텍스트
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'LIVE';
      case 'development': return 'DEV';
      case 'planning': return 'PLAN';
      default: return 'UNKNOWN';
    }
  };

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className={styles.projectListView}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          LOADING MUSIC ROOMS...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.projectListView}>
      {/* 헤더 */}
      <div className={styles.projectHeader}>
        <h1 className={styles.projectTitle}>
          VLYNK MUSIC ROOMS
        </h1>
        <div className={styles.projectSubtitle}>
          ━━━ COLLABORATIVE AUDIO WORKSPACES ━━━
        </div>
        <div className={styles.userWelcome}>
          WELCOME, <span className={styles.username}>{currentUser}</span>
        </div>
      </div>

      {/* 통계 정보 */}
      <div className={styles.statsSection}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{rooms.length}</span>
          <span className={styles.statLabel}>TOTAL ROOMS</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>
            {rooms.filter(room => room.status === 'active').length}
          </span>
          <span className={styles.statLabel}>ACTIVE</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>
            {rooms.reduce((total, room) => total + room.participants, 0)}
          </span>
          <span className={styles.statLabel}>USERS ONLINE</span>
        </div>
      </div>

      {/* 방 생성 버튼 */}
      <div className={styles.createSection}>
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className={styles.createRoomBtn}
          >
            + CREATE NEW ROOM
          </button>
        ) : (
          <div className={styles.createRoomForm}>
            <div className={styles.createFormHeader}>
              CREATE NEW MUSIC ROOM
            </div>
            <div className={styles.createInputContainer}>
              <span className={styles.inputPrompt}>&gt;</span>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
                placeholder="Enter room name..."
                className={styles.createRoomInput}
                maxLength={30}
                autoFocus
              />
            </div>
            <div className={styles.createButtonGroup}>
              <button
                onClick={handleCreateRoom}
                disabled={newRoomName.trim().length < 2}
                className={styles.confirmBtn}
              >
                CREATE
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewRoomName('');
                }}
                className={styles.cancelBtn}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 방 목록 */}
      {rooms.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>♪</div>
          <div className={styles.emptyMessage}>
            NO MUSIC ROOMS AVAILABLE
          </div>
          <div className={styles.emptySubtext}>
            Create your first room to get started!
          </div>
        </div>
      ) : (
        <div className={styles.roomsGrid}>
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`${styles.roomCard} ${getRoomStatusClass(room.status)}`}
              onClick={() => onJoinRoom(room.id)}
            >
              {/* 방 상태 배지 */}
              <div className={styles.roomStatusBadge}>
                {getStatusText(room.status)}
              </div>

              {/* 방 이름 */}
              <div className={styles.roomName}>
                {room.name}
              </div>

              {/* 방 설명 */}
              {room.description && (
                <div className={styles.roomDescription}>
                  {room.description}
                </div>
              )}

              {/* 장르 태그 */}
              {room.genres && room.genres.length > 0 && (
                <div className={styles.roomGenres}>
                  {room.genres.slice(0, 3).map((genre, index) => (
                    <span key={index} className={styles.genreTag}>
                      #{genre}
                    </span>
                  ))}
                  {room.genres.length > 3 && (
                    <span className={styles.genreMore}>
                      +{room.genres.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* 방 통계 */}
              <div className={styles.roomStats}>
                <div className={styles.statGroup}>
                  <span className={styles.statIcon}>👥</span>
                  <span>{room.participants}/{room.maxUsers}</span>
                </div>
                <div className={styles.statGroup}>
                  <span className={styles.statIcon}>🎵</span>
                  <span>{room.musicCount}</span>
                </div>
                <div className={styles.statGroup}>
                  <span className={styles.statIcon}>📅</span>
                  <span>{new Date(room.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* 방 정보 버튼 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewRoomInfo(room.id);
                }}
                className={styles.roomInfoBtn}
              >
                INFO
              </button>

              {/* 호버 효과용 오버레이 */}
              <div className={styles.roomCardOverlay}>
                <div className={styles.joinPrompt}>
                  CLICK TO JOIN ROOM
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 하단 정보 */}
      <div className={styles.footerInfo}>
        <div className={styles.systemStatus}>
          <span className={styles.statusIndicator}></span>
          SYSTEM OPERATIONAL
        </div>
        <div className={styles.lastUpdate}>
          LAST UPDATE: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}