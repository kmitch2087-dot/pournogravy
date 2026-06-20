import { useEffect, useState } from 'react';

// Singleton — all subscribing cards flip simultaneously
let listeners: Array<(show: boolean) => void> = [];
let timer: ReturnType<typeof setInterval> | null = null;
let current = false;

export function useCardImageFlip(hasZoom: boolean): boolean {
  const [showZoom, setShowZoom] = useState(false);

  useEffect(() => {
    if (!hasZoom) return; // no zoom → never subscribes, always returns false

    listeners.push(setShowZoom);

    if (!timer) {
      timer = setInterval(() => {
        current = !current;
        listeners.forEach(fn => fn(current));
      }, 3500);
    }

    return () => {
      listeners = listeners.filter(fn => fn !== setShowZoom);
      if (listeners.length === 0 && timer) {
        clearInterval(timer);
        timer = null;
        current = false;
      }
    };
  }, [hasZoom]);

  return showZoom;
}
