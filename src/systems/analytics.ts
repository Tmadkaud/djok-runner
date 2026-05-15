import { state } from './state';

export type AnalyticsEvent =
  | { type: 'age_gate_pass'; age: number }
  | { type: 'age_gate_fail' }
  | { type: 'game_start' }
  | { type: 'level_start'; island: string }
  | { type: 'level_complete'; island: string; score: number; stars: number }
  | { type: 'game_over'; score: number; distance: number; island: string }
  | { type: 'email_submit'; source: string }
  | { type: 'share_click'; network: string }
  | { type: 'promo_code_generated' }
  | { type: 'promo_code_revealed' }
  | { type: 'recipe_unlocked'; name: string }
  | { type: 'product_link_click'; rum: string }
  | { type: 'retailer_lookup' };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

let gaInitialized = false;

/**
 * Conditionally bootstraps Google Analytics 4 (gtag.js) at runtime.
 *
 * Behaviour:
 *  - Reads `import.meta.env.VITE_GA4_ID`. If empty/undefined, no-op.
 *  - Requires explicit cookie consent (`state.cookieConsent === true`).
 *    If consent is null or false, no-op — call again after consent is granted.
 *  - Idempotent: subsequent calls after a successful init do nothing.
 *  - Dynamically appends the gtag.js script and primes `window.dataLayer`
 *    + `window.gtag` so existing `trackEvent()` calls are picked up.
 */
export function setupAnalytics(): void {
  if (gaInitialized) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const measurementId = import.meta.env.VITE_GA4_ID as string | undefined;
  if (!measurementId) return;

  if (state.cookieConsent !== true) return;

  window.dataLayer = window.dataLayer || [];
  // gtag must forward its arguments to dataLayer (the canonical GA4 snippet).
  window.gtag = function gtag(...args: unknown[]): void {
    (window.dataLayer as unknown[]).push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { anonymize_ip: true });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  gaInitialized = true;
}

export function trackEvent(event: AnalyticsEvent): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', event);
  }
  if (typeof window === 'undefined' || !window.gtag) return;
  const { type, ...params } = event;
  try {
    window.gtag('event', type, params);
  } catch {
    /* analytics is non-critical */
  }
}
