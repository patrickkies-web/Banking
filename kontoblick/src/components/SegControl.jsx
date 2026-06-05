import { useRef, useEffect, useState } from 'react';
import styles from './SegControl.module.css';

export default function SegControl({ value, onChange, options }) {
  const ref = useRef(null);
  const [glider, setGlider] = useState({ left: 2, width: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = options.findIndex(o => o.value === value);
    const btn = el.querySelectorAll('button')[idx];
    if (btn) setGlider({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [value, options.length]);

  return (
    <div className={styles.seg} ref={ref}>
      <div
        className={styles.glider}
        style={{ left: glider.left, width: glider.width }}
      />
      {options.map(o => (
        <button
          key={o.value}
          className={`${styles.option} ${value === o.value ? styles.active : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.badge > 0 && <span className={styles.badge}>{o.badge}</span>}
        </button>
      ))}
    </div>
  );
}
