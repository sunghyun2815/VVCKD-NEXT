import styles from './vcktor.module.css';

interface NicknameBarProps {
  nickname: string;
  coin: string | number;
  onCoinClick: () => void;
}

export default function NicknameBar({ nickname, coin, onCoinClick }: NicknameBarProps) {
  return (
    <div className={styles.nicknameBar}>
      <button className={styles.nicknameBtn}>{nickname}</button>
      <button className={styles.coinBtn} onClick={onCoinClick}>🪙 {coin}</button>
    </div>
  );
}
