import { memo, useEffect, useState } from 'react';

function getNextMidnight(from) {
  const d = new Date(from);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

let sharedNow = Date.now();
const nowListeners = new Set();
let tickTimer = null;

function subscribeNow(fn) {
  nowListeners.add(fn);
  fn(sharedNow);
  if (!tickTimer) {
    tickTimer = setInterval(() => {
      sharedNow = Date.now();
      nowListeners.forEach((listener) => listener(sharedNow));
    }, 1000);
  }
  return () => {
    nowListeners.delete(fn);
    if (nowListeners.size === 0 && tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  };
}

const pad2 = (n) => n.toString().padStart(2, '0');

export default memo(function CountdownTimer({ variant = 'offers' }) {
  const [now, setNow] = useState(sharedNow);
  const [offersVisible, setOffersVisible] = useState(false);

  useEffect(() => subscribeNow(setNow), []);

  useEffect(() => {
    if (variant !== 'floating') return undefined;
    const el = document.getElementById('offers');
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => setOffersVisible(entries[0].isIntersecting),
      { rootMargin: '-35% 0px -35% 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [variant]);

  const diff = Math.max(0, getNextMidnight(now) - now);
  const totalSeconds = Math.floor(diff / 1000);
  if (totalSeconds <= 0) return null;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const time = `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;

  if (variant === 'floating') {
    if (offersVisible) return null;
    return (
      <div className="floating-timer" role="timer" aria-live="polite">
        <span className="floating-timer-info">
          <span className="floating-timer-label">⏰ العرض ينتهي خلال</span>
          <span className="floating-timer-time">{time}</span>
        </span>
        <a className="floating-timer-cta" href="#offers">اطلب دلوقتي</a>
      </div>
    );
  }

  if (variant === 'bar') {
    return (
      <span className="countdown-bar" role="timer" aria-live="polite">
        <span className="countdown-bar-label">⏰ العروض تنتهي خلال</span>
        <span className="countdown-bar-time">{time}</span>
      </span>
    );
  }

  return (
    <div className="countdown" role="timer" aria-live="polite">
      <span className="countdown-title">⏰ العروض تنتهي خلال</span>
      <span className="countdown-time">{time}</span>
    </div>
  );
});
