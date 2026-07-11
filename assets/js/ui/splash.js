import { Heart } from '../vendor/lucide.mjs';
import { renderLucideIcon } from '../lib/lucide-icon.js';
import { APP_NAME } from '../config.js';
import { waitForTransition } from '../lib/transitions.js';

export const SPLASH_FADE_MS = 480;

export function initSplash() {
  const iconRoot = document.getElementById('splash-heart-icon');
  const titleEl = document.querySelector('.splash-title');

  if (iconRoot) {
    iconRoot.innerHTML = renderLucideIcon(Heart, {
      strokeWidth: 1.75,
      width: 28,
      height: 28,
    });
  }

  if (titleEl) titleEl.textContent = APP_NAME;
}

export async function dismissSplash() {
  const splash = document.getElementById('splash-view');
  if (!splash || splash.classList.contains('hidden')) return;

  splash.classList.add('is-exiting');
  await waitForTransition(splash, SPLASH_FADE_MS);

  splash.classList.add('hidden');
  splash.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('splash-page');
}
