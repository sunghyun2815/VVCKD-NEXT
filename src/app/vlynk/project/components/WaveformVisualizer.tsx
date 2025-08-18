// src/app/vlynk/project/components/WaveformVisualizer.tsx
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { WaveformData, ChatMessage } from '../types/project.types';
import styles from '../waveform.module.css';

interface WaveformVisualizerProps {
  waveformData: WaveformData | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  comments: ChatMessage[];
  isLoading?: boolean;
}

export default function WaveformVisualizer({
  waveformData,
  currentTime,
  duration,
  onSeek,
  comments,
  isLoading = false
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 150 });
  const [hoveredComment, setHoveredComment] = useState<ChatMessage | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // 캔버스 크기 조정
  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = 150;
    
    setCanvasDimensions({ width, height });
  }, []);

  // 창 크기 변경 감지
  useEffect(() => {
    updateCanvasSize();
    
    const handleResize = () => updateCanvasSize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasSize]);

  // 웨이브폼 그리기
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasDimensions;
    const { data } = waveformData;

    // 캔버스 초기화
    ctx.clearRect(0, 0, width, height);
    
    // 배경 그라디언트
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    bgGradient.addColorStop(1, 'rgba(255, 102, 0, 0.1)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 웨이브폼 데이터 계산
    const samplesPerPixel = Math.floor(data.length / width);
    const centerY = height / 2;
    
    // 재생된 부분과 재생되지 않은 부분을 구분하기 위한 progressX 계산
    const progressX = duration > 0 ? (currentTime / duration) * width : 0;

    // 웨이브폼 그리기 (재생되지 않은 부분)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 102, 0, 0.6)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x < width; x++) {
      const startSample = x * samplesPerPixel;
      const endSample = Math.min(startSample + samplesPerPixel, data.length);
      
      let min = 0;
      let max = 0;
      
      for (let i = startSample; i < endSample; i++) {
        const sample = data[i] || 0;
        min = Math.min(min, sample);
        max = Math.max(max, sample);
      }
      
      const minY = centerY + (min * centerY * 0.8);
      const maxY = centerY + (max * centerY * 0.8);
      
      if (x === 0) {
        ctx.moveTo(x, minY);
      } else {
        ctx.lineTo(x, minY);
      }
      ctx.lineTo(x, maxY);
    }
    ctx.stroke();

    // 재생된 부분 하이라이트
    if (progressX > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      
      const playedGradient = ctx.createLinearGradient(0, 0, progressX, 0);
      playedGradient.addColorStop(0, '#00ff00');
      playedGradient.addColorStop(1, '#ffaa00');
      
      ctx.fillStyle = playedGradient;
      ctx.fillRect(0, 0, progressX, height);
      ctx.restore();
    }

    // 센터 라인
    ctx.strokeStyle = 'rgba(255, 102, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // 재생 헤드 (현재 위치)
    if (progressX > 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
      
      // 재생 헤드 상단 표시
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(progressX - 5, 0);
      ctx.lineTo(progressX + 5, 0);
      ctx.lineTo(progressX, 10);
      ctx.closePath();
      ctx.fill();
    }

    // 시간 마커 (10초 간격)
    ctx.fillStyle = 'rgba(255, 102, 0, 0.4)';
    ctx.font = '10px Courier New';
    ctx.textAlign = 'center';
    
    if (duration > 0) {
      for (let time = 0; time <= duration; time += 10) {
        const x = (time / duration) * width;
        
        // 세로 선
        ctx.strokeStyle = 'rgba(255, 102, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, height - 20);
        ctx.lineTo(x, height);
        ctx.stroke();
        
        // 시간 텍스트
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        ctx.fillText(timeText, x, height - 5);
      }
    }
  }, [waveformData, canvasDimensions, currentTime, duration]);

  // 댓글 마커 그리기
  const drawComments = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasDimensions;

    comments.forEach(comment => {
      const x = (comment.timestamp / duration) * width;
      
      // 댓글 마커
      ctx.fillStyle = comment.type === 'voice' ? '#ff00ff' : '#00ffff';
      ctx.beginPath();
      ctx.arc(x, 15, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // 댓글 라인
      ctx.strokeStyle = comment.type === 'voice' ? 'rgba(255, 0, 255, 0.3)' : 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, height - 20);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }, [comments, duration, canvasDimensions]);

  // 캔버스 그리기
  useEffect(() => {
    drawWaveform();
    drawComments();
  }, [drawWaveform, drawComments]);

  // 클릭 처리
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || duration === 0) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    onSeek(Math.max(0, Math.min(newTime, duration)));
  };

  // 마우스 이동 처리 (댓글 호버)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || duration === 0) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    
    setMousePosition({ x: e.clientX, y: e.clientY });
    
    // 가장 가까운 댓글 찾기
    const nearestComment = comments.reduce((nearest, comment) => {
      const commentX = (comment.timestamp / duration) * rect.width;
      const distance = Math.abs(x - commentX);
      
      if (distance < 10 && (!nearest || distance < Math.abs(x - (nearest.timestamp / duration) * rect.width))) {
        return comment;
      }
      return nearest;
    }, null as ChatMessage | null);
    
    setHoveredComment(nearestComment);
  };

  const handleMouseLeave = () => {
    setHoveredComment(null);
  };

  if (isLoading) {
    return (
      <div className={styles.waveformContainer}>
        <div className={styles.loadingWaveform}>
          <div className={styles.loadingBars}>
            {Array.from({ length: 50 }, (_, i) => (
              <div 
                key={i} 
                className={styles.loadingBar}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <div className={styles.loadingText}>
            ANALYZING AUDIO WAVEFORM...
          </div>
        </div>
      </div>
    );
  }

  if (!waveformData) {
    return (
      <div className={styles.waveformContainer}>
        <div className={styles.noWaveformMessage}>
          <div className={styles.waveformIcon}>📊</div>
          <div className={styles.waveformText}>
            WAVEFORM WILL APPEAR HERE
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.waveformContainer} ref={containerRef}>
      <div className={styles.waveformHeader}>
        <div className={styles.waveformTitle}>
          AUDIO WAVEFORM ANALYZER
        </div>
        <div className={styles.waveformControls}>
          <div className={styles.commentLegend}>
            <span className={styles.textCommentLegend}>💬 Text</span>
            <span className={styles.voiceCommentLegend}>🎤 Voice</span>
          </div>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          className={styles.waveformCanvas}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: 'pointer' }}
        />
        
        {/* 댓글 툴팁 */}
        {hoveredComment && (
          <div 
            className={styles.commentTooltip}
            style={{
              left: mousePosition.x + 10,
              top: mousePosition.y - 60,
              position: 'fixed',
              zIndex: 1000
            }}
          >
            <div className={styles.tooltipHeader}>
              <span className={styles.commentUser}>{hoveredComment.user}</span>
              <span className={styles.commentTime}>
                {Math.floor(hoveredComment.timestamp / 60)}:
                {String(Math.floor(hoveredComment.timestamp % 60)).padStart(2, '0')}
              </span>
            </div>
            <div className={styles.tooltipMessage}>
              {hoveredComment.message}
            </div>
          </div>
        )}
      </div>

      <div className={styles.waveformFooter}>
        <div className={styles.waveformStats}>
          <span>Duration: {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
          <span>Comments: {comments.length}</span>
          <span>Current: {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
        </div>
        <div className={styles.waveformHint}>
          Click anywhere on the waveform to seek • Hover over markers to see comments
        </div>
      </div>
    </div>
  );
}