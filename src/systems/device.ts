const hasWindow = (): boolean => typeof window !== 'undefined';

export function isTouchDevice(): boolean {
  if (!hasWindow()) return false;
  const coarse = typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
  const touchPoints = typeof navigator !== 'undefined'
    && typeof navigator.maxTouchPoints === 'number'
    && navigator.maxTouchPoints > 0;
  return coarse || touchPoints;
}

export function isMobileViewport(): boolean {
  if (!hasWindow()) return false;
  return window.innerWidth < 900 || isTouchDevice();
}

export function isPortrait(): boolean {
  if (!hasWindow()) return false;
  return window.innerHeight > window.innerWidth;
}

export function onOrientationChange(cb: (portrait: boolean) => void): () => void {
  if (!hasWindow()) return () => { /* no-op */ };

  const handler = (): void => {
    cb(isPortrait());
  };

  let mql: MediaQueryList | null = null;
  if (typeof window.matchMedia === 'function') {
    mql = window.matchMedia('(orientation: portrait)');
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
    } else if (typeof (mql as MediaQueryList).addListener === 'function') {
      // Safari < 14 fallback
      (mql as MediaQueryList).addListener(handler);
    }
  }
  window.addEventListener('resize', handler);

  // Fire once so subscribers receive the initial state.
  handler();

  return () => {
    if (mql) {
      if (typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', handler);
      } else if (typeof (mql as MediaQueryList).removeListener === 'function') {
        (mql as MediaQueryList).removeListener(handler);
      }
    }
    window.removeEventListener('resize', handler);
  };
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate === 'function') {
    try {
      nav.vibrate(pattern);
    } catch {
      /* no-op */
    }
  }
}

export async function tryFullscreen(): Promise<void> {
  if (typeof document === 'undefined') return;
  const el = document.documentElement as HTMLElement & {
    requestFullscreen?: () => Promise<void>;
    webkitRequestFullscreen?: () => Promise<void>;
  };
  try {
    if (typeof el.requestFullscreen === 'function') {
      await el.requestFullscreen();
    } else if (typeof el.webkitRequestFullscreen === 'function') {
      await el.webkitRequestFullscreen();
    }
  } catch {
    /* best-effort, ignore */
  }
}
