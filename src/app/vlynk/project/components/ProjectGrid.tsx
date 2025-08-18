'use client';

import React, { useState, useEffect } from 'react';
import type { MusicRoom } from '../types/project.types';
import styles from './ProjectGrid.module.css';

// ===== Props 타입 =====
interface ProjectGridProps {
  rooms: MusicRoom[];
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: (roomName: string) => void;
  onViewRoomInfo: (roomId: string) => void;
  currentUser: string;
  isLoading?: boolean;
}

// ===== 메인 컴포넌트 =====
export default function ProjectGrid({
  rooms,
  onJoinRoom,
  onCreateRoom,
  onViewRoomInfo,
  currentUser,
  isLoading = false
}: ProjectGridProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'participants' | 'name' | 'activity'>('newest');
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'development' | 'planning'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 장르 옵션
  const genreOptions = [
    'lo-fi', 'electronic', 'ambient', 'hip-hop', 'jazz', 'rock', 
    'pop', 'classical', 'experimental', 'trap', 'house', 'techno'
  ];

  // 룸 필터링 및 정렬
  const filteredAndSortedRooms = React.useMemo(() => {
    let filtered = rooms.filter(room => {
      // 검색어 필터
      const matchesSearch = searchTerm === '' || 
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.createdBy.toLowerCase().includes(searchTerm.toLowerCase());

      // 상태 필터
      const matchesStatus = filterBy === 'all' || room.status === filterBy;

      return matchesSearch && matchesStatus;
    });

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'participants':
          return b.participants - a.participants;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'activity':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [rooms, searchTerm, filterBy, sortBy]);

  // 룸 생성 처리
  const handleCreateRoom = () => {
    if (newRoomName.trim().length < 2) {
      alert('룸 이름은 최소 2글자 이상이어야 합니다.');
      return;
    }

    if (newRoomName.trim().length > 50) {
      alert('룸 이름은 최대 50글자까지 입력 가능합니다.');
      return;
    }

    // 중복 이름 체크
    const isDuplicate = rooms.some(room => 
      room.name.toLowerCase() === newRoomName.trim().toLowerCase()
    );

    if (isDuplicate) {
      alert('이미 존재하는 룸 이름입니다.');
      return;
    }

    onCreateRoom(newRoomName.trim());
    setNewRoomName('');
    setSelectedGenres([]);
    setShowCreateModal(false);
  };

  // 장르 토글
  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  // 룸 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#00FF00';
      case 'development': return '#FFAA00';
      case 'planning': return '#0099FF';
      default: return '#666';
    }
  };

  // 룸 상태별 아이콘
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🔴';
      case 'development': return '⚙️';
      case 'planning': return '📋';
      default: return '⭕';
    }
  };

  // 시간 포맷팅
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return '방금 전';
    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}시간 전`;
    return `${Math.floor(diffMinutes / 1440)}일 전`;
  };

  return (
    <div className={styles.projectGrid}>
      {/* 헤더 섹션 */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h2 className={styles.title}>🎵 음악실 목록</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className={styles.createButton}
            disabled={isLoading}
          >
            ✨ 새 룸 만들기
          </button>
        </div>

        {/* 검색 및 필터 */}
        <div className={styles.controls}>
          <div className={styles.searchSection}>
            <div className={styles.searchWrapper}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="룸 이름, 설명, 생성자로 검색..."
                className={styles.searchInput}
              />
            </div>
          </div>

          <div className={styles.filterSection}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={styles.sortSelect}
            >
              <option value="newest">🕒 최신순</option>
              <option value="participants">👥 참가자순</option>
              <option value="name">📝 이름순</option>
              <option value="activity">⚡ 활동순</option>
            </select>

            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className={styles.filterSelect}
            >
              <option value="all">📋 전체</option>
              <option value="active">🔴 활성</option>
              <option value="development">⚙️ 개발중</option>
              <option value="planning">📋 계획중</option>
            </select>
          </div>
        </div>

        {/* 통계 정보 */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{filteredAndSortedRooms.length}</span>
            <span className={styles.statLabel}>개 룸</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>
              {filteredAndSortedRooms.reduce((sum, room) => sum + room.participants, 0)}
            </span>
            <span className={styles.statLabel}>명 참여 중</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>
              {filteredAndSortedRooms.filter(room => room.status === 'active').length}
            </span>
            <span className={styles.statLabel}>개 활성 룸</span>
          </div>
        </div>
      </div>

      {/* 룸 그리드 */}
      <div className={styles.roomsContainer}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <p>룸 목록을 불러오는 중...</p>
          </div>
        ) : filteredAndSortedRooms.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎵</div>
            <h3>표시할 룸이 없습니다</h3>
            <p>
              {searchTerm || filterBy !== 'all' ? 
                '검색 조건을 변경하거나 새로운 룸을 만들어보세요.' :
                '첫 번째 음악실을 만들어보세요!'
              }
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className={styles.emptyCreateButton}
            >
              ✨ 새 룸 만들기
            </button>
          </div>
        ) : (
          <div className={styles.roomGrid}>
            {filteredAndSortedRooms.map((room) => (
              <div key={room.id} className={styles.roomCard}>
                {/* 룸 헤더 */}
                <div className={styles.roomHeader}>
                  <div className={styles.roomStatus}>
                    <span 
                      className={styles.statusIndicator}
                      style={{ color: getStatusColor(room.status) }}
                    >
                      {getStatusIcon(room.status)}
                    </span>
                    <span 
                      className={styles.statusText}
                      style={{ color: getStatusColor(room.status) }}
                    >
                      {room.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => onViewRoomInfo(room.id)}
                    className={styles.infoButton}
                    title="룸 정보 보기"
                  >
                    ℹ️
                  </button>
                </div>

                {/* 룸 이름 */}
                <h3 className={styles.roomName}>{room.name}</h3>

                {/* 룸 설명 */}
                <p className={styles.roomDescription}>
                  {room.description || '설명이 없습니다.'}
                </p>

                {/* 장르 태그 */}
                {room.genres.length > 0 && (
                  <div className={styles.genreTags}>
                    {room.genres.slice(0, 3).map((genre) => (
                      <span key={genre} className={styles.genreTag}>
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

                {/* 룸 통계 */}
                <div className={styles.roomStats}>
                  <div className={styles.roomStat}>
                    <span className={styles.roomStatIcon}>👥</span>
                    <span className={styles.roomStatText}>
                      {room.participants}/{room.maxUsers}
                    </span>
                  </div>
                  <div className={styles.roomStat}>
                    <span className={styles.roomStatIcon}>🎵</span>
                    <span className={styles.roomStatText}>
                      {room.musicCount}곡
                    </span>
                  </div>
                  <div className={styles.roomStat}>
                    <span className={styles.roomStatIcon}>👤</span>
                    <span className={styles.roomStatText}>
                      {room.createdBy}
                    </span>
                  </div>
                </div>

                {/* 시간 정보 */}
                <div className={styles.roomTime}>
                  <span className={styles.timeLabel}>생성:</span>
                  <span className={styles.timeValue}>{formatTime(room.createdAt)}</span>
                  {room.updatedAt !== room.createdAt && (
                    <>
                      <span className={styles.timeLabel}>활동:</span>
                      <span className={styles.timeValue}>{formatTime(room.updatedAt)}</span>
                    </>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div className={styles.roomActions}>
                  <button
                    onClick={() => onJoinRoom(room.id)}
                    disabled={room.participants >= room.maxUsers || isLoading}
                    className={`${styles.joinButton} ${
                      room.participants >= room.maxUsers ? styles.fullRoom : ''
                    }`}
                  >
                    {room.participants >= room.maxUsers ? '🔒 만석' : '🚀 입장하기'}
                  </button>
                </div>

                {/* 룸 소유자 표시 */}
                {room.createdBy === currentUser && (
                  <div className={styles.ownerBadge}>
                    👑 내 룸
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 룸 생성 모달 */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div 
            className={styles.createModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>🆕 새 음악실 만들기</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className={styles.closeButton}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>룸 이름 *</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="예: Lo-Fi Study Session"
                  className={styles.roomNameInput}
                  maxLength={50}
                  autoFocus
                />
                <div className={styles.charCount}>
                  {newRoomName.length}/50
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>장르 (선택)</label>
                <div className={styles.genreSelector}>
                  {genreOptions.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`${styles.genreOption} ${
                        selectedGenres.includes(genre) ? styles.selected : ''
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
                {selectedGenres.length > 0 && (
                  <div className={styles.selectedGenres}>
                    선택된 장르: {selectedGenres.join(', ')}
                  </div>
                )}
              </div>

              <div className={styles.roomPreview}>
                <h4>미리보기</h4>
                <div className={styles.previewCard}>
                  <div className={styles.previewName}>
                    {newRoomName || '룸 이름을 입력하세요'}
                  </div>
                  <div className={styles.previewCreator}>
                    생성자: {currentUser}
                  </div>
                  {selectedGenres.length > 0 && (
                    <div className={styles.previewGenres}>
                      {selectedGenres.map(genre => (
                        <span key={genre} className={styles.previewGenreTag}>
                          #{genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setShowCreateModal(false)}
                className={styles.cancelButton}
              >
                취소
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!newRoomName.trim()}
                className={styles.confirmButton}
              >
                🚀 룸 만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}