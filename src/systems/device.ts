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
    const orient = (screen as Screen & { orientation?: { lock?: (o: string) => Promise<void> } }).orientation;
    if (orient && typeof orient.lock === 'function') {
      orient.lock('landscape').catch(() => { /* best-effort */ });
    }
  } catch {
    /* best-effort, ignore */
  }
}

/** True if the page is currently being displayed in PWA standalone mode
 * (e.g. installed via "Add to Home Screen" on iOS, or via the Chrome
 * install prompt on Android/desktop). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const navStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const mqStandalone = typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches;
  return navStandalone || mqStandalone;
}

/** True if running in mobile Safari on iOS / iPadOS (where the standard
 * Fullscreen API was unsupported until iOS 16.4 and where "Add to Home
 * Screen" is the most reliable path to a chrome-less full-screen game). */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
  // iPadOS 13+ identifies as Mac with touch — detect via maxTouchPoints
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOS || iPadOS;
}

/** True if the standard Fullscreen API is usable (best-effort feature test). */
export function fullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement as HTMLElement & {
    requestFullscreen?: () => Promise<void>;
    webkitRequestFullscreen?: () => Promise<void>;
  };
  return typeof el.requestFullscreen === 'function'
    || typeof el.webkitRequestFullscreen === 'function';
}
