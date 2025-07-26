import { useState, useEffect } from 'react';

/**
 * Hook that provides a live countdown in seconds to a target timestamp
 * Updates every second and automatically cleans up
 */
export function useCountdown(targetTimestamp: number): number {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((targetTimestamp - Date.now()) / 1000))
  );

  useEffect(() => {
    // Return early if target is in the past
    if (targetTimestamp <= Date.now()) {
      setSecondsLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((targetTimestamp - Date.now()) / 1000));
      setSecondsLeft(remaining);
      
      // Clear interval when countdown reaches 0
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp]);

  return secondsLeft;
}