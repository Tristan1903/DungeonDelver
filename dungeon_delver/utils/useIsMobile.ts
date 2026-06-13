import { useState, useEffect } from 'react';

export function useBreakpoint(breakpoint: number): boolean {
  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    const check = () => setIsSmall(window.innerWidth < breakpoint);
    check();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const throttled = () => {
      if (timer) return;
      timer = setTimeout(() => { check(); timer = null; }, 100);
    };
    window.addEventListener('resize', throttled);
    return () => {
      window.removeEventListener('resize', throttled);
      if (timer) clearTimeout(timer);
    };
  }, [breakpoint]);
  return isSmall;
}

export function useIsMobile(): boolean {
  return useBreakpoint(768);
}
