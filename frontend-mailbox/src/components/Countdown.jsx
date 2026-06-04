import { useState, useEffect, useRef } from 'react';

/**
 * Countdown timer component.
 * Uses a ref for onExpire to avoid resetting the interval on every parent render.
 */
export default function Countdown({ minutes, onExpire }) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const onExpireRef = useRef(onExpire);

  // Keep ref updated without re-triggering the interval
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Run the interval only once on mount (key prop handles reset)
  useEffect(() => {
    setSecondsLeft(minutes * 60); // reset when mounted via key change

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpireRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty: only runs once per mount (component is re-keyed to reset)

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  const isUrgent = secondsLeft < 30;

  return (
    <div className={`font-mono text-lg font-bold px-4 py-1.5 rounded-lg transition-colors ${
      isUrgent
        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
    }`}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  );
}
