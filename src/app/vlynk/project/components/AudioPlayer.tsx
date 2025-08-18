// src/app/vlynk/project/components/AudioPlayer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import type { AudioFile, AudioPlayerState } from '../types/project.types';
import styles from '../audioplayer.module.css';

interface AudioPlayerProps {
  track: AudioFile | null;
  playerState: AudioPlayerState;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function AudioPlayer({
  track,
  playerState,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onNext,
  onPrevious
}: AudioPlayerProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 시간 포맷팅 함수
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 진행률 계산
  const progressPercentage = playerState.duration > 0 
    ? (playerState.currentTime / playerState.duration) * 100 
    : 0;

  // 프로그레스 바 클릭 처리
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!track || playerState.duration === 0) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * playerState.duration;
    
    onSeek(Math.max(0, Math.min(newTime, playerState.duration)));
  };

  // 볼륨 슬라이더 처리
  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const percentage = 1 - (clickY / rect.height); // 위쪽이 높은 볼륨
    const newVolume = Math.max(0, Math.min(percentage, 1));
    
    onVolumeChange(newVolume);
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          playerState.isPlaying ? onPause() : onPlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onSeek(Math.max(0, playerState.currentTime - 10));
          break;
        case 'ArrowRight':
          e.preventDefault();
          onSeek(Math.min(playerState.duration, playerState.currentTime + 10));
          break;
        case 'ArrowUp':
          e.preventDefault();
          onVolumeChange(Math.min(1, playerState.volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          onVolumeChange(Math.max(0, playerState.volume - 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playerState, onPlay, onPause, onSeek, onVolumeChange]);

  if (!track) {
    return (
      <div className={styles.audioPlayerContainer}>
        <div className={styles.noTrackMessage}>
          <div className={styles.noTrackIcon}>♪</div>
          <div className={styles.noTrackText}>
            SELECT A TRACK TO START PLAYING
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.audioPlayerContainer}>
      {/* 트랙 정보 */}
      <div className={styles.trackInfoSection}>
        <div className={styles.trackArtwork}>
          <div className={styles.artworkPlaceholder}>
            🎵
          </div>
        </div>
        
        <div className={styles.trackDetails}>
          <div className={styles.trackTitle}>
            {track.name}
          </div>
          <div className={styles.trackUploader}>
            uploaded by <span className={styles.uploaderName}>{track.uploader}</span>
          </div>
          <div className={styles.trackMeta}>
            {(track.size / 1024 / 1024).toFixed(1)} MB • {track.type}
          </div>
        </div>

        {/* 로딩 인디케이터 */}
        {playerState.isLoading && (
          <div className={styles.loadingIndicator}>
            <div className={styles.loadingSpinner}></div>
            <span>LOADING...</span>
          </div>
        )}
      </div>

      {/* 메인 컨트롤 */}
      <div className={styles.mainControls}>
        {/* 재생 버튼들 */}
        <div className={styles.playbackControls}>
          <button
            onClick={onPrevious}
            className={styles.controlBtn}
            title="Previous Track (Shift+Left)"
          >
            ⏮
          </button>
          
          <button
            onClick={playerState.isPlaying ? onPause : onPlay}
            className={`${styles.controlBtn} ${styles.playPauseBtn}`}
            disabled={playerState.isLoading}
            title="Play/Pause (Space)"
          >
            {playerState.isLoading ? (
              <div className={styles.miniSpinner}></div>
            ) : playerState.isPlaying ? (
              '⏸'
            ) : (
              '▶'
            )}
          </button>
          
          <button
            onClick={onNext}
            className={styles.controlBtn}
            title="Next Track (Shift+Right)"
          >
            ⏭
          </button>
        </div>

        {/* 진행률 바 */}
        <div className={styles.progressSection}>
          <div className={styles.timeDisplay}>
            {formatTime(playerState.currentTime)}
          </div>
          
          <div 
            className={styles.progressBar}
            onClick={handleProgressClick}
          >
            <div className={styles.progressTrack}>
              <div 
                className={styles.progressFill}
                style={{ width: `${progressPercentage}%` }}
              />
              <div 
                className={styles.progressHandle}
                style={{ left: `${progressPercentage}%` }}
              />
            </div>
          </div>
          
          <div className={styles.timeDisplay}>
            {formatTime(playerState.duration)}
          </div>
        </div>

        {/* 볼륨 컨트롤 */}
        <div className={styles.volumeSection}>
          <button
            className={styles.volumeBtn}
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            title="Volume Control"
          >
            {playerState.volume === 0 ? '🔇' : 
             playerState.volume < 0.5 ? '🔉' : '🔊'}
          </button>
          
          {showVolumeSlider && (
            <div className={styles.volumeSlider}>
              <div 
                className={styles.volumeTrack}
                onClick={handleVolumeClick}
              >
                <div 
                  className={styles.volumeFill}
                  style={{ height: `${playerState.volume * 100}%` }}
                />
                <div 
                  className={styles.volumeHandle}
                  style={{ bottom: `${playerState.volume * 100}%` }}
                />
              </div>
              <div className={styles.volumeValue}>
                {Math.round(playerState.volume * 100)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {playerState.error && (
        <div className={styles.errorMessage}>
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorText}>{playerState.error}</span>
        </div>
      )}

      {/* 키보드 단축키 힌트 */}
      <div className={styles.shortcutsHint}>
        <span>SHORTCUTS:</span>
        <span>SPACE=Play/Pause</span>
        <span>←→=Seek</span>
        <span>↑↓=Volume</span>
      </div>
    </div>
  );
}