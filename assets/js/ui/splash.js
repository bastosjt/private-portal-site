import { APP_NAME, SPLASH_MIN_DURATION_MS } from '../config.js';
import { createLoveHeartsController } from '../lib/love-hearts.js';
import { waitForTransition } from '../lib/transitions.js';

export const SPLASH_FADE_MS = 480;

let splashStartedAt = 0;
let splashLoveController = null;

/**
 * xPct / yPct : position absolue (% viewport, coin supérieur gauche).
 * scale : 0.22 (tiny) → 0.62 (large).
 */
export const SPLASH_LOVE_HEARTS = [
  { xPct: 2.1, yPct: 3.4, scale: 0.52, rotate: -14, delay: 0.02, duration: 0.92 },
  { xPct: 6.8, yPct: 1.9, scale: 0.28, rotate: 8, delay: 0.07, duration: 1.04 },
  { xPct: 11.4, yPct: 5.7, scale: 0.38, rotate: -6, delay: 0.11, duration: 0.88 },
  { xPct: 3.6, yPct: 9.2, scale: 0.22, rotate: 12, delay: 0.15, duration: 1.0 },
  { xPct: 14.2, yPct: 2.8, scale: 0.48, rotate: -18, delay: 0.05, duration: 0.96 },
  { xPct: 8.3, yPct: 12.6, scale: 0.32, rotate: 5, delay: 0.19, duration: 1.06 },
  { xPct: 16.8, yPct: 7.4, scale: 0.44, rotate: -9, delay: 0.13, duration: 0.9 },
  { xPct: 5.1, yPct: 15.8, scale: 0.26, rotate: 16, delay: 0.23, duration: 0.86 },
  { xPct: 9.6, yPct: 6.3, scale: 0.24, rotate: -3, delay: 0.27, duration: 0.91 },
  { xPct: 17.3, yPct: 11.2, scale: 0.3, rotate: 9, delay: 0.31, duration: 0.97 },

  { xPct: 22.4, yPct: 2.2, scale: 0.34, rotate: -7, delay: 0.04, duration: 0.98 },
  { xPct: 31.8, yPct: 4.6, scale: 0.24, rotate: 11, delay: 0.09, duration: 0.94 },
  { xPct: 41.3, yPct: 1.7, scale: 0.42, rotate: -13, delay: 0.14, duration: 1.02 },
  { xPct: 52.6, yPct: 3.9, scale: 0.3, rotate: 6, delay: 0.08, duration: 0.9 },
  { xPct: 63.1, yPct: 2.5, scale: 0.5, rotate: -10, delay: 0.12, duration: 1.04 },
  { xPct: 73.7, yPct: 4.1, scale: 0.28, rotate: 14, delay: 0.17, duration: 0.88 },
  { xPct: 84.2, yPct: 1.9, scale: 0.36, rotate: -5, delay: 0.21, duration: 0.96 },
  { xPct: 26.3, yPct: 3.1, scale: 0.26, rotate: 8, delay: 0.25, duration: 0.93 },
  { xPct: 56.4, yPct: 2.8, scale: 0.32, rotate: -9, delay: 0.29, duration: 1.0 },
  { xPct: 78.9, yPct: 3.6, scale: 0.22, rotate: 12, delay: 0.33, duration: 0.89 },

  { xPct: 91.6, yPct: 3.1, scale: 0.46, rotate: 11, delay: 0.03, duration: 1.0 },
  { xPct: 95.2, yPct: 6.8, scale: 0.26, rotate: -15, delay: 0.1, duration: 1.06 },
  { xPct: 88.4, yPct: 8.9, scale: 0.4, rotate: 6, delay: 0.14, duration: 0.88 },
  { xPct: 93.7, yPct: 11.4, scale: 0.22, rotate: -8, delay: 0.06, duration: 0.94 },
  { xPct: 86.1, yPct: 2.4, scale: 0.54, rotate: 19, delay: 0.2, duration: 0.86 },
  { xPct: 97.1, yPct: 9.7, scale: 0.32, rotate: -12, delay: 0.12, duration: 1.02 },
  { xPct: 90.3, yPct: 14.2, scale: 0.38, rotate: 4, delay: 0.24, duration: 0.9 },
  { xPct: 83.8, yPct: 12.1, scale: 0.48, rotate: -17, delay: 0.08, duration: 1.04 },
  { xPct: 92.4, yPct: 5.2, scale: 0.26, rotate: -4, delay: 0.28, duration: 0.93 },
  { xPct: 85.3, yPct: 6.7, scale: 0.34, rotate: 13, delay: 0.32, duration: 0.99 },

  { xPct: 96.4, yPct: 19.3, scale: 0.3, rotate: 9, delay: 0.05, duration: 0.96 },
  { xPct: 94.1, yPct: 27.8, scale: 0.44, rotate: -11, delay: 0.11, duration: 1.0 },
  { xPct: 97.3, yPct: 33.6, scale: 0.24, rotate: 7, delay: 0.16, duration: 0.88 },
  { xPct: 95.6, yPct: 68.2, scale: 0.36, rotate: -8, delay: 0.07, duration: 1.02 },
  { xPct: 97.8, yPct: 74.9, scale: 0.28, rotate: 13, delay: 0.13, duration: 0.92 },
  { xPct: 94.4, yPct: 82.4, scale: 0.5, rotate: -6, delay: 0.19, duration: 0.98 },
  { xPct: 96.9, yPct: 88.7, scale: 0.32, rotate: 10, delay: 0.22, duration: 0.86 },
  { xPct: 96.1, yPct: 36.1, scale: 0.22, rotate: -5, delay: 0.26, duration: 0.94 },
  { xPct: 95.3, yPct: 63.8, scale: 0.28, rotate: 11, delay: 0.3, duration: 0.91 },

  { xPct: 91.2, yPct: 93.8, scale: 0.42, rotate: 8, delay: 0.04, duration: 0.94 },
  { xPct: 95.8, yPct: 96.1, scale: 0.26, rotate: -14, delay: 0.1, duration: 1.04 },
  { xPct: 88.6, yPct: 97.2, scale: 0.48, rotate: 12, delay: 0.15, duration: 0.88 },
  { xPct: 93.4, yPct: 90.4, scale: 0.34, rotate: -6, delay: 0.08, duration: 1.06 },
  { xPct: 86.9, yPct: 94.7, scale: 0.22, rotate: 17, delay: 0.21, duration: 0.9 },
  { xPct: 97.4, yPct: 92.3, scale: 0.4, rotate: -9, delay: 0.12, duration: 0.96 },
  { xPct: 90.1, yPct: 88.1, scale: 0.3, rotate: 5, delay: 0.18, duration: 1.02 },
  { xPct: 84.7, yPct: 96.8, scale: 0.52, rotate: -19, delay: 0.06, duration: 0.86 },
  { xPct: 89.7, yPct: 91.8, scale: 0.3, rotate: 7, delay: 0.29, duration: 0.94 },
  { xPct: 93.8, yPct: 86.2, scale: 0.24, rotate: -12, delay: 0.33, duration: 0.88 },

  { xPct: 76.3, yPct: 97.1, scale: 0.28, rotate: -7, delay: 0.05, duration: 1.0 },
  { xPct: 67.8, yPct: 95.4, scale: 0.38, rotate: 11, delay: 0.1, duration: 0.94 },
  { xPct: 58.2, yPct: 97.6, scale: 0.24, rotate: -13, delay: 0.14, duration: 1.02 },
  { xPct: 47.9, yPct: 95.8, scale: 0.46, rotate: 6, delay: 0.09, duration: 0.88 },
  { xPct: 37.4, yPct: 97.3, scale: 0.32, rotate: -10, delay: 0.13, duration: 1.04 },
  { xPct: 27.1, yPct: 95.1, scale: 0.36, rotate: 14, delay: 0.17, duration: 0.9 },
  { xPct: 17.6, yPct: 97.4, scale: 0.26, rotate: -5, delay: 0.2, duration: 0.96 },
  { xPct: 24.8, yPct: 96.2, scale: 0.3, rotate: 9, delay: 0.24, duration: 0.92 },
  { xPct: 53.1, yPct: 97.8, scale: 0.24, rotate: -7, delay: 0.28, duration: 1.01 },
  { xPct: 71.4, yPct: 96.5, scale: 0.34, rotate: 14, delay: 0.32, duration: 0.87 },

  { xPct: 2.8, yPct: 94.2, scale: 0.44, rotate: -7, delay: 0.03, duration: 1.0 },
  { xPct: 7.4, yPct: 97.6, scale: 0.28, rotate: 14, delay: 0.09, duration: 0.92 },
  { xPct: 12.8, yPct: 92.8, scale: 0.36, rotate: -16, delay: 0.15, duration: 1.06 },
  { xPct: 4.2, yPct: 90.1, scale: 0.22, rotate: 10, delay: 0.07, duration: 0.94 },
  { xPct: 15.6, yPct: 96.3, scale: 0.5, rotate: -4, delay: 0.2, duration: 0.88 },
  { xPct: 9.1, yPct: 88.4, scale: 0.32, rotate: 18, delay: 0.11, duration: 1.02 },
  { xPct: 16.4, yPct: 91.7, scale: 0.4, rotate: -13, delay: 0.19, duration: 0.9 },
  { xPct: 3.4, yPct: 97.8, scale: 0.26, rotate: 6, delay: 0.24, duration: 0.86 },
  { xPct: 8.7, yPct: 93.1, scale: 0.28, rotate: -8, delay: 0.27, duration: 0.95 },
  { xPct: 13.1, yPct: 89.4, scale: 0.36, rotate: 11, delay: 0.31, duration: 1.01 },

  { xPct: 1.8, yPct: 21.7, scale: 0.34, rotate: -9, delay: 0.04, duration: 0.98 },
  { xPct: 3.6, yPct: 29.4, scale: 0.24, rotate: 12, delay: 0.1, duration: 0.94 },
  { xPct: 2.2, yPct: 34.8, scale: 0.42, rotate: -11, delay: 0.15, duration: 1.0 },
  { xPct: 4.1, yPct: 67.6, scale: 0.3, rotate: 8, delay: 0.08, duration: 0.96 },
  { xPct: 1.6, yPct: 73.2, scale: 0.48, rotate: -7, delay: 0.12, duration: 1.04 },
  { xPct: 3.9, yPct: 81.1, scale: 0.26, rotate: 15, delay: 0.18, duration: 0.88 },
  { xPct: 2.5, yPct: 87.9, scale: 0.38, rotate: -10, delay: 0.22, duration: 0.92 },
  { xPct: 3.2, yPct: 36.1, scale: 0.22, rotate: 6, delay: 0.26, duration: 0.94 },
  { xPct: 2.8, yPct: 63.4, scale: 0.28, rotate: -8, delay: 0.3, duration: 0.9 },
  { xPct: 4.3, yPct: 25.9, scale: 0.22, rotate: 4, delay: 0.34, duration: 0.91 },
  { xPct: 2.1, yPct: 31.6, scale: 0.26, rotate: -6, delay: 0.36, duration: 0.95 },
  { xPct: 3.7, yPct: 78.4, scale: 0.24, rotate: 7, delay: 0.38, duration: 0.89 },

  { xPct: 12.4, yPct: 14.1, scale: 0.22, rotate: -5, delay: 0.35, duration: 0.92 },
  { xPct: 18.9, yPct: 4.7, scale: 0.26, rotate: 10, delay: 0.39, duration: 0.96 },
  { xPct: 19.8, yPct: 2.6, scale: 0.24, rotate: -8, delay: 0.37, duration: 0.88 },
  { xPct: 20.4, yPct: 8.4, scale: 0.3, rotate: 14, delay: 0.41, duration: 1.0 },
  { xPct: 35.2, yPct: 2.4, scale: 0.22, rotate: -11, delay: 0.34, duration: 0.94 },
  { xPct: 48.7, yPct: 4.2, scale: 0.28, rotate: 7, delay: 0.38, duration: 0.9 },
  { xPct: 68.2, yPct: 1.4, scale: 0.32, rotate: -6, delay: 0.42, duration: 1.02 },
  { xPct: 79.2, yPct: 7.8, scale: 0.26, rotate: 9, delay: 0.36, duration: 0.93 },
  { xPct: 80.6, yPct: 2.3, scale: 0.24, rotate: -13, delay: 0.4, duration: 0.97 },
  { xPct: 81.2, yPct: 14.6, scale: 0.22, rotate: 5, delay: 0.44, duration: 0.91 },
  { xPct: 94.6, yPct: 13.8, scale: 0.26, rotate: -7, delay: 0.43, duration: 0.95 },
  { xPct: 96.8, yPct: 30.4, scale: 0.24, rotate: 8, delay: 0.35, duration: 0.93 },
  { xPct: 95.1, yPct: 25.1, scale: 0.28, rotate: -9, delay: 0.37, duration: 0.97 },
  { xPct: 94.7, yPct: 77.3, scale: 0.22, rotate: 6, delay: 0.39, duration: 0.9 },
  { xPct: 97.2, yPct: 24.6, scale: 0.26, rotate: -4, delay: 0.41, duration: 0.94 },
  { xPct: 82.4, yPct: 88.9, scale: 0.24, rotate: 11, delay: 0.35, duration: 0.92 },
  { xPct: 91.8, yPct: 84.6, scale: 0.28, rotate: -8, delay: 0.39, duration: 0.96 },
  { xPct: 33.6, yPct: 96.8, scale: 0.22, rotate: 5, delay: 0.36, duration: 0.88 },
  { xPct: 44.2, yPct: 97.2, scale: 0.26, rotate: -10, delay: 0.4, duration: 0.94 },
  { xPct: 62.7, yPct: 95.6, scale: 0.3, rotate: 8, delay: 0.44, duration: 1.0 },
  { xPct: 81.3, yPct: 97.9, scale: 0.24, rotate: -6, delay: 0.38, duration: 0.9 },
  { xPct: 11.8, yPct: 87.3, scale: 0.22, rotate: 12, delay: 0.34, duration: 0.93 },
  { xPct: 18.2, yPct: 94.1, scale: 0.26, rotate: -9, delay: 0.38, duration: 0.97 },
  { xPct: 21.6, yPct: 96.4, scale: 0.24, rotate: 4, delay: 0.42, duration: 0.91 },
];

export function initSplash() {
  splashStartedAt = Date.now();
  const titleEl = document.querySelector('.splash-title');
  const cornerRoot = document.getElementById('splash-corner-hearts');
  const trigger = document.getElementById('splash-heart-trigger');
  const splash = document.getElementById('splash-view');

  if (titleEl) titleEl.textContent = APP_NAME;

  if (cornerRoot && splash) {
    splashLoveController?.destroy();
    splashLoveController = createLoveHeartsController({
      container: cornerRoot,
      root: splash,
      trigger,
      hearts: SPLASH_LOVE_HEARTS,
      placementMode: 'splash',
    });
  }
}

async function waitForMinSplashDuration() {
  if (!SPLASH_MIN_DURATION_MS) return;
  const remaining = SPLASH_MIN_DURATION_MS - (Date.now() - splashStartedAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

export async function dismissSplash() {
  const splash = document.getElementById('splash-view');
  if (!splash || splash.classList.contains('hidden')) return;

  await waitForMinSplashDuration();

  splashLoveController?.destroy();
  splashLoveController = null;

  splash.classList.add('is-exiting');
  await waitForTransition(splash, SPLASH_FADE_MS);

  splash.classList.add('hidden');
  splash.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('splash-page');
}
