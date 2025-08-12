'use client';

import React, { useMemo } from 'react';
import { useVlynkSocket } from '../hooks/useVlynkSocket';
import type { VlynkBaseProps } from '../types/vlynk.types';
import styles from '../vlynk.module.css';

interface ConnectionStatusProps extends VlynkBaseProps {
  showLatency?: boolean;
  onClick?: () => void;
}

export function ConnectionStatus({ 
  showLatency = false, 
  onClick,
  className,
  'data-testid': testId 
}: ConnectionStatusProps) {
  const { 
    connectionState, 
    isConnected, 
    isConnecting, 
    isReconnecting, 
    hasError,
    measureLatency 
  } = useVlynkSocket();

  // 상태별 아이콘과 텍스트 계산 (메모이제이션)
  const statusInfo = useMemo(() => {
    if (hasError) {
      return {
        icon: '🔴',
        text: 'ERROR',
        status: 'error' as const,
        description: connectionState.lastError || 'Connection error',
        color: '#ff0000',
        pulse: false,
      };
    }

    if (isReconnecting) {
      const attempts = connectionState.reconnectAttempts;
      return {
        icon: '🟡',
        text: `RECONNECTING (${attempts}/5)`,
        status: 'reconnecting' as const,
        description: `Attempting to reconnect... (${attempts} attempts)`,
        color: '#ffaa00',
        pulse: true,
      };
    }

    if (isConnecting) {
      return {
        icon: '🟡',
        text: 'CONNECTING...',
        status: 'connecting' as const,
        description: 'Establishing connection to VLYNK server',
        color: '#ffff00',
        pulse: true,
      };
    }

    if (isConnected) {
      const connectedTime = connectionState.connectedAt 
        ? formatConnectionTime(connectionState.connectedAt)
        : '';
      
      return {
        icon: '🟢',
        text: 'CONNECTED',
        status: 'connected' as const,
        description: `Connected to VLYNK server${connectedTime}`,
        color: '#00ff00',
        pulse: false,
      };
    }

    return {
      icon: '⚪',
      text: 'DISCONNECTED',
      status: 'disconnected' as const,
      description: 'Not connected to VLYNK server',
      color: '#888888',
      pulse: false,
    };
  }, [hasError, isReconnecting, isConnecting, isConnected, connectionState]);

  // 레이턴시 정보
  const latencyInfo = useMemo(() => {
    if (!showLatency || !connectionState.latency) return null;

    const latency = Math.round(connectionState.latency);
    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    let color: string;

    if (latency < 50) {
      quality = 'excellent';
      color = '#00ff00';
    } else if (latency < 100) {
      quality = 'good';
      color = '#ffff00';
    } else if (latency < 200) {
      quality = 'fair';
      color = '#ffaa00';
    } else {
      quality = 'poor';
      color = '#ff0000';
    }

    return { latency, quality, color };
  }, [showLatency, connectionState.latency]);

  // 클릭 핸들러 (레이턴시 측정 등에 활용)
  const handleClick = async () => {
    if (onClick) {
      onClick();
    } else if (isConnected) {
      // 기본 동작: 레이턴시 측정
      try {
        await measureLatency();
      } catch (error) {
        console.warn('Failed to measure latency:', error);
      }
    }
  };

  return (
    <div
      className={`${styles.connectionStatus} ${className || ''}`}
      data-status={statusInfo.status}
      data-testid={testId || 'vlynk-connection-status'}
      onClick={handleClick}
      style={{
        '--status-color': statusInfo.color,
        cursor: onClick || isConnected ? 'pointer' : 'default',
      } as React.CSSProperties}
      title={statusInfo.description}
    >
      {/* 상태 아이콘과 텍스트 */}
      <div className={styles.statusMain}>
        <span 
          className={`${styles.statusIcon} ${statusInfo.pulse ? styles.pulse : ''}`}
          role="img"
          aria-label={`Connection status: ${statusInfo.text}`}
        >
          {statusInfo.icon}
        </span>
        <span className={styles.statusText}>
          {statusInfo.text}
        </span>
      </div>

      {/* 레이턴시 정보 (선택적) */}
      {latencyInfo && (
        <div 
          className={styles.latencyInfo}
          style={{ '--latency-color': latencyInfo.color } as React.CSSProperties}
          title={`Latency: ${latencyInfo.latency}ms (${latencyInfo.quality})`}
        >
          <span className={styles.latencyValue}>
            {latencyInfo.latency}ms
          </span>
          <span className={styles.latencyBars}>
            {renderLatencyBars(latencyInfo.quality)}
          </span>
        </div>
      )}

      {/* 추가 정보 (에러 시) */}
      {hasError && connectionState.lastError && (
        <div className={styles.errorDetails}>
          <small>{truncateError(connectionState.lastError)}</small>
        </div>
      )}
    </div>
  );
}

// 유틸리티 함수들
function formatConnectionTime(connectedAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - connectedAt.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffHour > 0) {
    return ` (${diffHour}h)`;
  } else if (diffMin > 0) {
    return ` (${diffMin}m)`;
  } else {
    return ` (${diffSec}s)`;
  }
}

function truncateError(error: string, maxLength = 30): string {
  return error.length > maxLength ? `${error.substring(0, maxLength)}...` : error;
}

function renderLatencyBars(quality: 'excellent' | 'good' | 'fair' | 'poor'): string {
  switch (quality) {
    case 'excellent': return '█████';
    case 'good': return '████▒';
    case 'fair': return '███▒▒';
    case 'poor': return '██▒▒▒';
    default: return '▒▒▒▒▒';
  }
}

// 타입 가드 (다른 컴포넌트에서 사용 가능)
export function isConnectionHealthy(
  status: ReturnType<typeof useVlynkSocket>['connectionState']['status']
): boolean {
  return status === 'connected';
}

// HOC: 연결 상태에 따른 조건부 렌더링
export function withConnectionGuard<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ status: string }>
) {
  return function GuardedComponent(props: P) {
    const { isConnected, connectionState } = useVlynkSocket();

    if (!isConnected) {
      const Fallback = fallback || DefaultConnectionFallback;
      return <Fallback status={connectionState.status} />;
    }

    return <Component {...props} />;
  };
}

function DefaultConnectionFallback({ status }: { status: string }) {
  return (
    <div className={styles.connectionFallback}>
      <div className={styles.fallbackMessage}>
        Connection required
      </div>
      <div className={styles.fallbackStatus}>
        Status: {status}
      </div>
    </div>
  );
}