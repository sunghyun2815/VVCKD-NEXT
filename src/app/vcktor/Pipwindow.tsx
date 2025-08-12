import React, { useRef, useState, ReactNode } from 'react';
import styles from './vcktor.module.css';

interface PipWindowProps {
  title: string;
  minWidth?: number;
  minHeight?: number;
  initWidth?: number;
  initHeight?: number;
  onClose: () => void;
  children: ReactNode;
}
const PipWindow: React.FC<PipWindowProps> = ({
  title,
  minWidth = 320,
  minHeight = 160,
  initWidth = 380,
  initHeight = 280,
  onClose,
  children,
}) => {
  const windowRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x: window.innerWidth - initWidth - 22, y: window.innerHeight - initHeight - 32 });
  const [size, setSize] = useState({ w: initWidth, h: initHeight });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(false);

  function handleBarMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    setDragging(true);
    setRel({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    e.stopPropagation();
    e.preventDefault();
  }
  function handleMouseMove(e: MouseEvent) {
    if (dragging) {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - size.w, e.clientX - rel.x)),
        y: Math.max(0, Math.min(window.innerHeight - (minimized ? 54 : size.h), e.clientY - rel.y)),
      });
    }
    if (resizing) {
      setSize({
        w: Math.max(minWidth, Math.min(window.innerWidth-pos.x, e.clientX - pos.x)),
        h: Math.max(minHeight, Math.min(window.innerHeight-pos.y, e.clientY - pos.y)),
      });
    }
  }
  function handleMouseUp() {
    setDragging(false);
    setResizing(false);
  }
  React.useEffect(() => {
    if (dragging || resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  });
  React.useEffect(() => {
    function updateOnResize() {
      setPos(p => ({
        x: Math.max(0, Math.min(window.innerWidth - size.w, p.x)),
        y: Math.max(0, Math.min(window.innerHeight - size.h, p.y)),
      }));
    }
    window.addEventListener('resize', updateOnResize);
    return () => window.removeEventListener('resize', updateOnResize);
  }, [size.w, size.h]);

  return (
    <div
      ref={windowRef}
      className={styles.pipWindow}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: minimized ? 46 : size.h,
        zIndex: 2200,
      }}
    >
      <div className={styles.pipBar} onMouseDown={handleBarMouseDown}>
        <span className={styles.pipTitle}>{title}</span>
        <div className={styles.pipBarBtns}>
          <button className={styles.pipBtn} onClick={() => setMinimized(m => !m)}>{minimized ? '□' : '–'}</button>
          <button className={styles.pipBtn} onClick={onClose}>×</button>
        </div>
      </div>
      {!minimized && (
        <div className={styles.pipContent}>{children}</div>
      )}
      {/* Resize-handle */}
      {!minimized && (
        <div
          className={styles.pipResizeHandle}
          onMouseDown={e => {
            e.preventDefault();
            setResizing(true);
          }}
        />
      )}
    </div>
  );
};
export default PipWindow;
