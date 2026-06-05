import { useEffect, useState } from 'react';
import styles from './NavBar.module.css';

export default function NavBar({ title, subtitle, action, leftAction }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        {leftAction
          ? <button className={styles.leftAction} onClick={leftAction.onPress}>{leftAction.label}</button>
          : <div className={styles.smallTitle}>{title}</div>
        }
        {leftAction && <div className={styles.smallTitle}>{title}</div>}
        {action && (
          <button className={styles.action} onClick={action.onPress}>
            {action.label}
          </button>
        )}
      </div>
      <h1 className={styles.largeTitle}>{title}</h1>
      {subtitle && <p className={styles.sub}>{subtitle}</p>}
    </div>
  );
}
