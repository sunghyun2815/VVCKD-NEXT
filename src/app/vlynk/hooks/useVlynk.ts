'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/components/VlynkSocketProvider';

interface User {
  id: string;
  username: string;
  role: 'guest' | 'user' | 'admin';
  joinedAt: string;
}

export const useVlynkAuth = () => {
  const { socket } = useSocket();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 복원 (개발 환경에서만)
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('vlynk_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error('Failed to parse saved user:', e);
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string): Promise<boolean> => {
    if (!socket || !username.trim()) {
      setError('Invalid username or no connection');
      return false;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        setError('Login timeout');
        setIsLoading(false);
        resolve(false);
      }, 5000);

      socket.emit('user_join', { username: username.trim() });

      socket.once('user_join_success', (userData: User) => {
        clearTimeout(timeout);
        setUser(userData);
        setIsLoading(false);
        
        // 개발 환경에서만 로컬 스토리지에 저장
        if (typeof window !== 'undefined') {
          localStorage.setItem('vlynk_user', JSON.stringify(userData));
        }
        
        resolve(true);
      });

      socket.once('user_join_error', (errorData: { message: string }) => {
        clearTimeout(timeout);
        setError(errorData.message);
        setIsLoading(false);
        resolve(false);
      });
    });
  };

  const logout = () => {
    if (socket) {
      socket.emit('user_leave');
    }
    
    setUser(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vlynk_user');
    }
  };

  return {
    user,
    isLoading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };
};
