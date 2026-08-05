import { useState, useEffect } from 'react';

export interface ResponsiveLayoutInfo {
  isMobile: boolean;
  isLandscape: boolean;
  isMobilePortrait: boolean;
  screenWidth: number;
}

export function useResponsiveLayout(): ResponsiveLayoutInfo {
  const [layoutInfo, setLayoutInfo] = useState<ResponsiveLayoutInfo>(() => {
    const isClient = typeof window !== 'undefined';
    const width = isClient ? window.innerWidth : 1200;
    const isMobile = width < 768;
    const isLandscape = isClient ? window.matchMedia('(orientation: landscape)').matches : false;
    return {
      isMobile,
      isLandscape,
      isMobilePortrait: isMobile && !isLandscape,
      screenWidth: width,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const isMobile = width < 768;
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      setLayoutInfo({
        isMobile,
        isLandscape,
        isMobilePortrait: isMobile && !isLandscape,
        screenWidth: width,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return layoutInfo;
}
