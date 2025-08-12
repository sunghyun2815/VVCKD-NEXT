'use client';

import { useEffect } from 'react';
import '../../styles/navigation.css';


export default function Navigation() {
  useEffect(() => {
    const indicators = document.querySelectorAll('.indicator-dot');

    indicators.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        if (typeof window.navigateToPage === 'function') {
          window.navigateToPage(index);
        }
      });
    });

    return () => {
      indicators.forEach((dot) => {
        const clone = dot.cloneNode(true);
        dot.parentNode?.replaceChild(clone, dot);
      });
    };
  }, []);

  return (
    <div className="page-indicator">
      <div className="indicator-dot active" data-page="0"></div>
      <div className="indicator-dot" data-page="1"></div>
      <div className="indicator-dot" data-page="2"></div>
    </div>
  );
}
