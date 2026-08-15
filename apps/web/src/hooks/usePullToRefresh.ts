import { useState, useEffect, useCallback, useRef } from 'react';

export interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  pullThreshold?: number;
  disabled?: boolean;
}

export interface UsePullToRefreshReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  pullDistance: number;
  isPulling: boolean;
  isRefreshing: boolean;
}

export function usePullToRefresh({
  onRefresh,
  pullThreshold = 65,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const containerRef = useRef<HTMLDivElement>(null!);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const touchStartRef = useRef<{ y: number; x: number }>({ y: 0, x: 0 });
  const isRefreshingRef = useRef(isRefreshing);
  isRefreshingRef.current = isRefreshing;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshingRef.current) return;
    const container = containerRef.current;
    
    // Disparar puxada apenas quando estiver no topo da rolagem (scrollTop === 0)
    const isAtTop = container ? container.scrollTop <= 0 : window.scrollY <= 0;
    if (isAtTop && e.touches.length === 1) {
      touchStartRef.current = {
        y: e.touches[0].clientY,
        x: e.touches[0].clientX,
      };
      setIsPulling(true);
    }
  }, [disabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || !isPulling || isRefreshingRef.current) return;
    const container = containerRef.current;
    const isAtTop = container ? container.scrollTop <= 0 : window.scrollY <= 0;

    if (!isAtTop) {
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const diffY = currentY - touchStartRef.current.y;
    const diffX = Math.abs(currentX - touchStartRef.current.x);

    if (diffY > 0 && diffY > diffX) {
      const dampenedDistance = Math.min(diffY * 0.45, 120);
      setPullDistance(dampenedDistance);

      if (dampenedDistance > 10 && e.cancelable) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, isPulling]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || !isPulling || isRefreshingRef.current) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    setIsPulling(false);

    if (pullDistance >= pullThreshold) {
      setIsRefreshing(true);
      setPullDistance(pullThreshold);

      try {
        await onRefresh();
      } catch (err) {
        console.error('Erro ao executar Pull-to-Refresh:', err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 400);
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, isPulling, pullDistance, pullThreshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    pullDistance,
    isPulling,
    isRefreshing,
  };
}
