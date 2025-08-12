
'use client';

import { useEffect } from 'react';

export default function VisualEffects() {
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.03) {
        document.body.style.opacity = '0.8';
        setTimeout(() => {
          document.body.style.opacity = '1';
        }, 100);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
