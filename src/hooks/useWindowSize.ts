import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

export const useWindowSize = (): WindowSize => {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize(); // Call handler right away so state gets updated with initial window size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

export const useBreakpoint = () => {
  const { width } = useWindowSize();
  
  return {
    isMobile: width < 640, // Back to original mobile breakpoint
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    isSmallMobile: width < 480,
    isMediumMobile: width >= 480 && width < 640,
    isLargeMobile: width >= 640 && width < 768,
    width,
  };
};