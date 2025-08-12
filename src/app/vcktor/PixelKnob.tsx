'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './vcktor.module.css';

export default function PixelKnob({ label, onValueChange }: any) {
  const [value, setValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<any>(null);

  const calculateValue = useCallback((clientX: number, clientY: number) => {
    if (!knobRef.current) return value;
    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(clientY - centerY, clientX - centerX);
    let degree = angle * (180 / Math.PI);
    if (degree < 0) degree += 360;
    let newValue;
    if (degree >= 90 && degree <= 270) {
      newValue = 100 - ((degree - 90) / 180) * 100;
    } else {
      if (degree > 270) {
        newValue = ((360 - degree) / 90) * 100;
      } else {
        newValue = (degree / 90) * 100;
      }
    }
    return Math.min(100, Math.max(0, Math.round(newValue)));
  }, [value]);

  const handleMouseDown = useCallback((e: any) => {
    e.preventDefault();
    setIsDragging(true);
    const newValue = calculateValue(e.clientX, e.clientY);
    setValue(newValue);
    onValueChange(newValue);
  }, [calculateValue, onValueChange]);

  const handleWheel = useCallback((e: any) => {
    e.preventDefault();
    const increment = e.deltaY < 0 ? 5 : -5;
    const newValue = Math.max(0, Math.min(100, value + increment));
    setValue(newValue);
    onValueChange(newValue);
  }, [value, onValueChange]);

  const handleMouseMove = useCallback((e: any) => {
    if (!isDragging) return;
    const newValue = calculateValue(e.clientX, e.clientY);
    setValue(newValue);
    onValueChange(newValue);
  }, [isDragging, calculateValue, onValueChange]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleValueChange = useCallback((increment: number) => {
    const newValue = Math.max(0, Math.min(100, value + increment));
    setValue(newValue);
    onValueChange(newValue);
  }, [value, onValueChange]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const rotation = (value / 100) * 300 - 150;
  const steps = 12;
  const ledIndicators = Array.from({ length: steps + 1 }, (_, i) => {
    const angle = (i / steps) * 300 - 150;
    const radians = angle * (Math.PI / 180);
    const x = 40 + Math.cos(radians) * 32;
    const y = 40 + Math.sin(radians) * 32;
    const isActive = (i / steps) * 100 <= value;
    return (
      <div
        key={i}
        style={{
          position: 'absolute', left: `${x}px`, top: `${y}px`,
          width: '6px', height: '6px',
          backgroundColor: isActive ? '#FF5500' : '#442100',
          boxShadow: isActive ? '0 0 4px #FF5500' : 'none',
          transform: 'translate(-50%, -50%)'
        }}
      />
    );
  });

  return (
    <div className={styles.knobContainer}>
      <div className={styles.knobOuter}>
        {ledIndicators}
        <div
          ref={knobRef}
          className={styles.knobInner}
          style={{
            transform: `rotate(${rotation}deg)`,
          }}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
        >
          <div className={styles.knobLine}></div>
        </div>
      </div>
      <div className={styles.knobValue}>{value}</div>
      <div className={styles.knobBtnGroup}>
        <button className={styles.pixelButton} onClick={() => handleValueChange(5)}>+</button>
        <button className={styles.pixelButton} onClick={() => handleValueChange(-5)}>-</button>
      </div>
      <span style={{ marginLeft: '10px', flex: 1 }}>{label}</span>
    </div>
  );
}
