// src/app/vlynk/project/components/WaveformCanvas.tsx
'use client';
import React, { useRef, useEffect, useCallback } from 'react';

interface WaveformCanvasProps {
  audioFile: File | null;
  isPlaying: boolean;
  currentTime: number;
  totalTime: number;
  onSeek?: (time: number) => void;
  className?: string;
}

const WaveformCanvas: React.FC<WaveformCanvasProps> = ({ 
  audioFile, 
  isPlaying, 
  currentTime, 
  totalTime, 
  onSeek,
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformDataRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // 웨이브폼 데이터 생성
  const generateWaveform = useCallback(async (file: File | null) => {
    if (!canvasRef.current) return;
    
    try {
      // AudioContext 생성
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      if (file) {
        // 실제 오디오 파일 처리
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        
        // 웨이브폼 데이터 처리
        const data = audioBuffer.getChannelData(0);
        const barWidth = 4;
        const barSpacing = 3;
        const totalBarWidth = barWidth + barSpacing;
        const numBars = Math.floor(canvas.width / totalBarWidth);
        const samplesPerBar = Math.floor(data.length / numBars);
        
        // 각 바의 높이 계산
        const processedData = [];
        let maxAmplitude = 0;
        
        for (let i = 0; i < numBars; i++) {
          let min = 1.0;
          let max = -1.0;
          
          for (let j = 0; j < samplesPerBar; j++) {
            const sample = data[i * samplesPerBar + j] || 0;
            if (sample < min) min = sample;
            if (sample > max) max = sample;
          }
          
          const amplitude = Math.abs(max - min);
          maxAmplitude = Math.max(maxAmplitude, amplitude);
          processedData.push(amplitude);
        }
        
        // 정규화된 웨이브폼 데이터 저장
        waveformDataRef.current = {
          processedData: processedData.map((amp, index) => ({
            x: index * totalBarWidth,
            height: Math.max(2, (amp / maxAmplitude) * canvas.height * 0.8),
            width: barWidth
          })),
          width: canvas.width,
          height: canvas.height,
          isProcessed: true
        };
      } else {
        // 더미 웨이브폼 생성
        generateDummyWaveform(canvas.width, canvas.height);
      }
      
      drawWaveform();
    } catch (error) {
      console.error('웨이브폼 생성 오류:', error);
      if (canvasRef.current) {
        generateDummyWaveform(canvasRef.current.offsetWidth, canvasRef.current.offsetHeight);
        drawWaveform();
      }
    }
  }, []);
  
  // 더미 웨이브폼 생성
  const generateDummyWaveform = (width: number, height: number) => {
    const dummyBars = [];
    const numBars = Math.floor(width / 7); // 바 너비 4 + 간격 3
    
    for (let i = 0; i < numBars; i++) {
      const baseHeight = Math.random() * height * 0.7;
      const variation = (Math.sin(i * 0.1) + Math.cos(i * 0.05)) * height * 0.1;
      const finalHeight = Math.max(2, baseHeight + variation);
      
      dummyBars.push({
        x: i * 7,
        height: finalHeight,
        width: 4
      });
    }
    
    waveformDataRef.current = {
      processedData: dummyBars,
      width: width,
      height: height,
      isDummy: true
    };
  };
  
  // 웨이브폼 그리기
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !waveformDataRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { processedData, width, height } = waveformDataRef.current;
    
    // 캔버스 초기화
    canvas.width = canvas.width;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    const progressPercent = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;
    const progressPixel = (progressPercent / 100) * width;
    
    // 둥근 끝을 위한 설정
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 각 바 그리기
    processedData.forEach((bar: any) => {
      const { x, height: barHeight, width: barWidth } = bar;
      const centerY = height / 2;
      
      // 재생 위치에 따른 색상 결정
      let color;
      if (x <= progressPixel) {
        // 재생된 부분 - 녹색 그라디언트
        const intensity = Math.min(barHeight / (height * 0.4), 1);
        if (intensity > 0.8) {
          color = '#00ff88';
        } else if (intensity > 0.5) {
          color = '#00ff44';
        } else {
          color = '#44ff44';
        }
      } else {
        // 아직 재생되지 않은 부분 - 회색
        color = '#888888';
      }
      
      // 둥근 끝을 가진 선 그리기
      ctx.strokeStyle = color;
      ctx.lineWidth = barWidth;
      
      ctx.beginPath();
      ctx.moveTo(x + barWidth/2, centerY - barHeight/2);
      ctx.lineTo(x + barWidth/2, centerY + barHeight/2);
      ctx.stroke();
    });
    
  }, [currentTime, totalTime]);
  
  // 캔버스 클릭 핸들러 (시크 기능)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onSeek || totalTime === 0) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickPercent = x / canvas.width;
    const seekTime = clickPercent * totalTime;
    
    onSeek(seekTime);
  };
  
  // 웨이브폼 다시 그리기 (currentTime 변경시)
  useEffect(() => {
    drawWaveform();
  }, [currentTime, totalTime, drawWaveform]);
  
  // 오디오 파일 변경시 웨이브폼 재생성
  useEffect(() => {
    generateWaveform(audioFile);
  }, [audioFile, generateWaveform]);
  
  // 캔버스 리사이즈 핸들러
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        generateWaveform(audioFile);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [audioFile, generateWaveform]);
  
  return (
    <canvas
      ref={canvasRef}
      className={className}
      onClick={handleCanvasClick}
      style={{
        width: '100%',
        height: '100%',
        cursor: 'pointer',
        display: 'block'
      }}
    />
  );
};

export default WaveformCanvas;

// ===== project/page.tsx에서 사용할 코드 예시 =====

// project/page.tsx에 추가할 import
// import WaveformCanvas from './components/WaveformCanvas';

// project/page.tsx에서 웨이브폼 영역을 이렇게 교체하세요:

/*
<!-- 기존 웨이브폼 영역 교체 -->
<div className={styles.waveformMainArea}>
  <div className={styles.waveformContainerMain}>
    <WaveformCanvas
      audioFile={currentTrack?.file || null}
      isPlaying={isPlaying}
      currentTime={currentTime}
      totalTime={totalTime}
      onSeek={handleSeek}
      className={styles.waveformCanvasMain}
    />
    
    {!currentTrack && (
      <div className={styles.waveformLoadingMain}>
        🎵 Upload a track to see waveform<br/>
        Drag and drop or click upload button
      </div>
    )}
  </div>

  // 시간 표시
  <div className={styles.timeDisplay}>
    <span className={styles.timeCurrent}>{formatTime(currentTime)}</span>
    <span className={styles.timeSeparator}>/</span>
    <span className={styles.timeTotal}>{formatTime(totalTime)}</span>
  </div>

  // 컨트롤 버튼들
  <div className={styles.simpleControls}>
    <button 
      onClick={togglePlayback}
      disabled={!currentTrack}
      className={styles.playBtnMain}
    >
      {isPlaying ? '⏸️' : '▶️'}
    </button>
    <button 
      onClick={() => fileInputRef.current?.click()}
      className={styles.uploadBtnMain}
    >
      🎵 UPLOAD MUSIC
    </button>
  </div>
</div>
*/

// project/page.tsx에 추가할 유틸리티 함수들:

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const handleSeek = (time: number) => {
  if (audioRef.current) {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }
};

// project.module.css에 추가할 스타일들:
/*
.waveformMainArea {
  background: #111;
  margin: var(--vlynk-spacing-lg, 20px);
  padding: var(--vlynk-spacing-lg, 20px);
  border: 1px solid var(--vlynk-border-primary, #ff6600);
  flex: 1;
}

.waveformContainerMain {
  width: 100%;
  height: 200px;
  position: relative;
  background: #000;
  margin-bottom: var(--vlynk-spacing-md, 15px);
}

.waveformCanvasMain {
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.waveformLoadingMain {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--vlynk-primary, #ff6600);
  text-align: center;
  font-size: var(--vlynk-font-sm, 8px);
}

.timeDisplay {
  text-align: center;
  margin-bottom: var(--vlynk-spacing-md, 15px);
}

.timeCurrent {
  color: var(--vlynk-primary, #ff6600);
}

.timeSeparator {
  color: var(--vlynk-text-muted, #666);
  margin: 0 var(--vlynk-spacing-xs, 5px);
}

.timeTotal {
  color: var(--vlynk-text-secondary, #fff);
}

.simpleControls {
  display: flex;
  justify-content: center;
  gap: var(--vlynk-spacing-lg, 20px);
  align-items: center;
}

.playBtnMain, .uploadBtnMain {
  background: var(--vlynk-primary, #ff6600);
  color: var(--vlynk-text-inverse, #000);
  border: none;
  padding: var(--vlynk-spacing-md, 12px) var(--vlynk-spacing-lg, 20px);
  font-family: 'PressStart2P', 'Press Start 2P', monospace;
  font-size: var(--vlynk-font-sm, 8px);
  cursor: pointer;
  transition: all 0.2s;
}

.playBtnMain:hover, .uploadBtnMain:hover {
  background: var(--vlynk-secondary, #ffff00);
}

.playBtnMain:disabled {
  background: #444;
  color: #666;
  cursor: not-allowed;
}
*/