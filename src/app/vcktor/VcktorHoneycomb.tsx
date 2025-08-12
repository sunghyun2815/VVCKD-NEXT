import styles from './vcktor.module.css';

const honeycombList = [
  { name: 'James', img: '/vcktor/1.png', gender: 'male' },
  { name: 'Sofia', img: '/vcktor/2.png', gender: 'female' },
  { name: 'Alex', img: '/vcktor/3.png', gender: 'male' },
  { name: 'Emma', img: '/vcktor/4.png', gender: 'female' },
  { name: 'Michael', img: '/vcktor/5.png', gender: 'male' },
  { name: 'Olivia', img: '/vcktor/6.png', gender: 'female' }
];

export default function VcktorHoneycomb({ selected, onSelect }: any) {
  return (
    <div className={styles.honeycomb}>
      {honeycombList.map((v, idx) => (
        <div
          key={v.name}
          className={`${styles.hexagon} ${idx >= 3 ? styles.oddLine : ''} ${selected === idx ? styles.selected : ''}`}
          onClick={() => onSelect(idx)}
          tabIndex={0}
        >
          <div className={styles.hexIcon}>
            <div className={styles.hexMask}></div>
            <img className={styles.hexImage} src={v.img} alt={v.name} />
          </div>
          <span className={styles.hexLabel}>{v.name}</span>
        </div>
      ))}
    </div>
  );
}
export { honeycombList };
