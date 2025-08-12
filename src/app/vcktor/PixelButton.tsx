import styles from './vcktor.module.css';

export default function PixelButton({ children, onClick, variant = 'default', ...props }: any) {
  return (
    <button
      className={`${styles.pixelButton} ${variant === 'destructive' ? styles.pixelButtonDestructive : ''}`}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
