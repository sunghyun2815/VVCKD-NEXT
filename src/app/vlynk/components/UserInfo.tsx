'use client';

import { VlynkUser } from '../types';
import styles from './UserInfo.module.css';

interface UserInfoProps {
  user: VlynkUser | null;
  className?: string;
}

export default function UserInfo({ user, className }: UserInfoProps) {
  if (!user) return null;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#FF0000';
      case 'user': return '#FFFF00';
      default: return '#FFFFFF';
    }
  };

  return (
    <div className={`${styles.userInfo} ${className || ''}`}>
      USER: <span className={styles.username}>{user.username}</span>
      <span 
        className={styles.userRole}
        style={{ color: getRoleColor(user.role) }}
      >
        [{user.role.toUpperCase()}]
      </span>
    </div>
  );
}