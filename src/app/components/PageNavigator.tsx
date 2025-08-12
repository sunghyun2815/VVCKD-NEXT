'use client';

import { useEffect, useState } from 'react';

export default function PageNavigator({ children }: { children: React.ReactNode }) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Array.isArray(children) ? children.length : 1;

  useEffect(() => {
    const overlay = document.querySelector('.page-transition-overlay');

    const transition = (index: number) => {
      if (overlay) overlay.classList.add('active', 'glitch');
      setTimeout(() => {
        if (overlay) overlay.classList.remove('active', 'glitch');
        setCurrentPage(index);
      }, 500);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) transition((currentPage + 1) % totalPages);
      else transition((currentPage - 1 + totalPages) % totalPages);
    };

    window.addEventListener('wheel', onWheel, { passive: false });

    (window as any).navigateToPage = (index: number) => transition(index);

    return () => {
      window.removeEventListener('wheel', onWheel);
    };
  }, [currentPage, totalPages]);

  return (
    <div className="pages-container">
      {Array.isArray(children)
        ? children.map((child, index) =>
            index === currentPage ? (
              <div key={index} className="page active">
                {child}
              </div>
            ) : null
          )
        : children}
    </div>
  );
}
