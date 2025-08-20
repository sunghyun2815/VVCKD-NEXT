'use client';

import { useContext } from 'react';
import { SocketContext } from '../components/VlynkSocketProvider';

export const useVlynkSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useVlynkSocket must be used within VlynkSocketProvider');
  }
  return context;
};