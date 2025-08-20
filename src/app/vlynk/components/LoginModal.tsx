'use client';

import { useState } from 'react';
import styles from './LoginModal.module.css';

interface LoginModalProps {
  isOpen: boolean;
  onLogin: (username: string) => Promise<boolean>;
  title?: string;
  subtitle?: string;
}

export default function LoginModal({ 
  isOpen, 
  onLogin, 
  title = "VLYNK ACCESS",
  subtitle = "ENTER USERNAME"
}: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim()) return;
    
    setIsLoading(true);
    const success = await onLogin(username.trim());
    setIsLoading(false);
    
    if (!success) {
      // 에러 처리는 부모 컴포넌트에서
      setUsername('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.loginModal}>
      <div className={styles.loginTerminal}>
        <div className={styles.loginTitle}>{title}</div>
        <div className={styles.loginSubtitle}>{subtitle}</div>
        <input
          type="text"
          className={styles.loginInput}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="USERNAME"
          maxLength={20}
          disabled={isLoading}
          autoFocus
        />
        <button 
          className={styles.loginBtn} 
          onClick={handleLogin}
          disabled={isLoading || !username.trim()}
        >
          {isLoading ? 'CONNECTING...' : 'ENTER'}
        </button>
      </div>
    </div>
  );
}