import { useState, useEffect, useCallback, useRef } from 'react';

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
  
  // Use refs to store the latest handlers to avoid stale closures
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const onTouchStart = useCallback((e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    // Prioritize vertical swipes over horizontal ones for task navigation
    if (Math.abs(distanceY) > Math.abs(distanceX)) {
      if (isUpSwipe && handlersRef.current.onSwipeUp) {
        handlersRef.current.onSwipeUp();
      } else if (isDownSwipe && handlersRef.current.onSwipeDown) {
        handlersRef.current.onSwipeDown();
      }
    } else {
      if (isLeftSwipe && handlersRef.current.onSwipeLeft) {
        handlersRef.current.onSwipeLeft();
      } else if (isRightSwipe && handlersRef.current.onSwipeRight) {
        handlersRef.current.onSwipeRight();
      }
    }
  }, [touchStart, touchEnd, minSwipeDistance]);

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
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  // Return the event handlers in the format expected by React elements
  return {
    onTouchStart: (e: React.TouchEvent) => onTouchStart(e.nativeEvent),
    onTouchMove: (e: React.TouchEvent) => onTouchMove(e.nativeEvent),
    onTouchEnd: (e: React.TouchEvent) => onTouchEnd()
  };
}