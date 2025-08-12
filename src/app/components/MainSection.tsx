'use client';

import React, { useEffect, useRef, useState } from 'react';
import '../../styles/main.css';

const terminalLines = [
  'C:\\USERS\\GUEST> cd VVCKD',
  'C:\\USERS\\GUEST\\VVCKD> run.exe',
  'Initializing VVCKD version 1.0.0...',
  'Loading modules... OK',
  'Configuring audio synthesis... OK',
  'Establishing neural connections... OK',
  '.',
  '.',
  '.',
  '> VVCKD AI VOCAL SYNTHESIS ONLINE',
  '> LAUNCHING JUNE 2025',
  '> CLICK TO CONTINUE_'
];

export default function MainSection() {
  const [shownLines, setShownLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState('');
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);

  // 타이핑 효과
  useEffect(() => {
    if (lineIdx >= terminalLines.length) return;
    if (charIdx <= terminalLines[lineIdx].length) {
      setCurrentLine(terminalLines[lineIdx].slice(0, charIdx));
      const timeout = setTimeout(() => setCharIdx((idx) => idx + 1), 22);
      return () => clearTimeout(timeout);
    } else {
      setShownLines((prev) => [...prev, terminalLines[lineIdx]]);
      setLineIdx((idx) => idx + 1);
      setCharIdx(0);
      setCurrentLine('');
    }
  }, [charIdx, lineIdx]);

  return (
    <section className="page active split-content first-page" id="page-0">
      <div className="terminal-container">
        <div className="terminal">
          {shownLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          {lineIdx < terminalLines.length && (
            <div>
              {currentLine}
              <span className="blink-cursor" />
            </div>
          )}
        </div>
      </div>
      <div className="empty-space">
        <div className="empty-space-text">
          By 2025, we launched three core services:<br /><br />
          <b>VCKTOR</b>: AI vocal modeling engine.<br /><br />
          <b>VLYSSA</b>: Multilingual lyric assistant.<br /><br />
          <b>VLYNK</b>: Professional talent network.<br /><br />
          VVCKD has been adopted by top-tier labels and studios.
        </div>
      </div>
    </section>
  );
}
