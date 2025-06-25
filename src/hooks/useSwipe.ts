import { useState, useEffect } from 'react';

interface SwipeHandlers {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipe(handlers: SwipeHandlers) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    // Prioritize vertical swipes over horizontal ones for task navigation
    if (Math.abs(distanceY) > Math.abs(distanceX)) {
      if (isUpSwipe && handlers.onSwipeUp) {
        handlers.onSwipeUp();
      } else if (isDownSwipe && handlers.onSwipeDown) {
        handlers.onSwipeDown();
      }
    } else {
      if (isLeftSwipe && handlers.onSwipeLeft) {
        handlers.onSwipeLeft();
      } else if (isRightSwipe && handlers.onSwipeRight) {
        handlers.onSwipeRight();
      }
    }
  };

  useEffect(() => {
    const options = { passive: true };
    
    document.addEventListener('touchstart', onTouchStart, options);
    document.addEventListener('touchmove', onTouchMove, options);
    document.addEventListener('touchend', onTouchEnd, options);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]); // Include the callback functions in dependencies

  return { onTouchStart, onTouchMove, onTouchEnd };
}