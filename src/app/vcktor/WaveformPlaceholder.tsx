import styles from './vcktor.module.css';

export default function WaveformPlaceholder({ index, hasFile, fileName }: any) {
  const waveformBars = [
    { height: 10, x: 5 }, { height: 14, x: 15 }, { height: 18, x: 25 },
    { height: 12, x: 35 }, { height: 8, x: 45 }, { height: 14, x: 55 },
    { height: 18, x: 65 }, { height: 10, x: 75 }, { height: 16, x: 85 }, { height: 12, x: 95 }
  ];
  return (
    <div className={styles.waveform}>
      <div className={styles.waveformLabel}>
        <span>{`TRACK ${index + 1}`}</span>
        {hasFile && <span style={{ color: '#FF5500' }}>{fileName}</span>}
      </div>
      <svg width="100%" height="40" viewBox="0 0 100 40">
        {waveformBars.map((bar, i) => (
          <rect
            key={i}
            x={bar.x}
            y={20 - bar.height / 2}
            width={4}
            height={bar.height}
            fill={hasFile ? "#FF5500" : "#442100"}
          />
        ))}
      </svg>
    </div>
  );
}
