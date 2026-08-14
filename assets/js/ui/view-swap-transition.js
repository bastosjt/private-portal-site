import { nextFrame, waitForTransition } from '../lib/transitions.js';

export const VIEW_CROSSFADE_MS = 380;
export const VIEW_HEIGHT_RELEASE_MS = 480;

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function lockViewportHeight(viewport) {
  if (!viewport) return () => {};
  const height = Math.round(viewport.getBoundingClientRect().height);
  if (height > 0) viewport.style.minHeight = `${height}px`;
  return () => {
    viewport.style.minHeight = '';
    viewport.style.transition = '';
  };
}

export function resetViewportSwap(viewport) {
  viewport?.classList.remove('is-view-swapping');
  if (!viewport) return;
  viewport.style.minHeight = '';
  viewport.style.transition = '';
}

export async function releaseViewportHeight(viewport) {
  if (!viewport) return;
  const end = viewport.scrollHeight;
  viewport.style.transition = `min-height ${VIEW_HEIGHT_RELEASE_MS}ms var(--ease-out-expo)`;
  viewport.style.minHeight = `${end}px`;
  await waitForTransition(viewport, VIEW_HEIGHT_RELEASE_MS + 40);
  viewport.style.transition = '';
  viewport.style.minHeight = '';
}

/**
 * Crossfade d’un panneau unique (contenu remplacé au milieu du fondu).
 */
export async function crossfadeSinglePanel({
  viewport,
  panel,
  onMidSwap,
  releaseHeight = true,
  isCancelled = () => false,
} = {}) {
  if (!panel) {
    await onMidSwap?.();
    return;
  }

  if (prefersReducedMotion()) {
    await onMidSwap?.();
    panel.classList.add('is-active');
    return;
  }

  const unlock = lockViewportHeight(viewport);
  viewport?.classList.add('is-view-swapping');
  panel.classList.remove('is-active');

  await waitForTransition(panel, VIEW_CROSSFADE_MS);
  if (isCancelled()) return;

  await onMidSwap?.();
  if (isCancelled()) return;

  await nextFrame();
  if (isCancelled()) return;

  panel.classList.add('is-active');

  await waitForTransition(panel, VIEW_CROSSFADE_MS);
  if (isCancelled()) return;

  viewport?.classList.remove('is-view-swapping');
  unlock();

  if (releaseHeight) {
    await releaseViewportHeight(viewport);
  }
}
