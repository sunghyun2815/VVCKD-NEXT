'use client';
import { honeycombList } from './VcktorHoneycomb';
import styles from './vcktor.module.css';

const PixelAvatar = ({ gender }: any) =>
  gender === 'male' ? (
    <svg width="60" height="60" viewBox="0 0 60 60">
      <rect x="10" y="5" width="40" height="40" fill="#FF5500" />
      <rect x="14" y="9" width="32" height="32" fill="#000" />
      <rect x="20" y="17" width="6" height="6" fill="#FF5500" />
      <rect x="34" y="17" width="6" height="6" fill="#FF5500" />
      <rect x="24" y="30" width="12" height="4" fill="#FF5500" />
      <rect x="5" y="15" width="5" height="15" fill="#FF5500" />
      <rect x="50" y="15" width="5" height="15" fill="#FF5500" />
      <rect x="5" y="15" width="50" height="5" fill="#FF5500" />
      <rect x="14" y="5" width="32" height="4" fill="#FF5500" />
    </svg>
  ) : (
    <svg width="60" height="60" viewBox="0 0 60 60">
      <rect x="10" y="5" width="40" height="40" fill="#FF5500" />
      <rect x="14" y="9" width="32" height="32" fill="#000" />
      <rect x="20" y="17" width="6" height="6" fill="#FF5500" />
      <rect x="34" y="17" width="6" height="6" fill="#FF5500" />
      <rect x="24" y="32" width="12" height="2" fill="#FF5500" />
      <rect x="5" y="15" width="5" height="15" fill="#FF5500" />
      <rect x="50" y="15" width="5" height="15" fill="#FF5500" />
      <rect x="5" y="15" width="50" height="5" fill="#FF5500" />
      <rect x="8" y="5" width="44" height="4" fill="#FF5500" />
      <rect x="6" y="9" width="4" height="20" fill="#FF5500" />
      <rect x="50" y="9" width="4" height="20" fill="#FF5500" />
    </svg>
  );

export default function PixelCarousel({ selectedIndex, setSelectedIndex }: any) {
  const models = honeycombList;
  const handleWheel = (event: any) => {
    event.preventDefault();
    const newIndex = selectedIndex + (event.deltaY > 0 ? 1 : -1);
    if (newIndex >= 0 && newIndex < models.length) {
      setSelectedIndex(newIndex);
    }
  };
  return (
    <div
      className={styles.carouselWrap}
      style={{
        height: '160px', overflow: 'hidden', position: 'relative', border: '2px solid #FF5500', display: 'flex'
      }}
      onWheel={handleWheel}
    >
      <div style={{ width: '100px', position: 'relative', borderRight: '2px solid #FF5500', overflow: 'hidden' }}>
        {models.map((model, index) => (
          <div
            key={model.name}
            style={{
              position: 'absolute',
              top: `${50 + (index - selectedIndex) * 45}px`,
              left: '20px',
              transition: 'all 0.3s',
              opacity: Math.abs(index - selectedIndex) > 2 ? 0 : 1,
              transform: `scale(${1 - Math.abs(index - selectedIndex) * 0.2})`
            }}
          >
            <PixelAvatar gender={model.gender} />
          </div>
        ))}
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        {models.map((model, index) => (
          <div
            key={model.name + '-name'}
            style={{
              position: 'absolute',
              top: `${50 + (index - selectedIndex) * 45}px`,
              left: '30px',
              width: 'calc(100% - 40px)',
              textAlign: 'left',
              transition: 'all 0.3s',
              opacity: Math.abs(index - selectedIndex) > 2 ? 0 : 1,
              color: index === selectedIndex ? '#FF5500' : "#442100",
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >{`> ${model.name}`}</div>
        ))}
      </div>
    </div>
  );
}
