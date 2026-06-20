import { useEffect, useState } from 'react';

// Singleton: all cards on the page flip simultaneously
let listeners: Array<(idx: number) => void> = [];
let timer: ReturnType<typeof setInterval> | null = null;
let currentIdx = 0;

function startTimer(imageCount: number) {
  if (timer) return;
  timer = setInterval(() => {
    currentIdx = (currentIdx + 1) % imageCount;
    listeners.forEach(fn => fn(currentIdx));
  }, 3500);
}

export function useCardImageFlip(imageCount: number) {
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (imageCount < 2) return;
    listeners.push(setImgIdx);
    startTimer(imageCount);
    return () => {
      listeners = listeners.filter(fn => fn !== setImgIdx);
      if (listeners.length === 0 && timer) {
        clearInterval(timer);
        timer = null;
        currentIdx = 0;
      }
    };
  }, [imageCount]);

  return imgIdx;
}
