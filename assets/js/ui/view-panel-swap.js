import { nextFrame, waitForTransition } from '../lib/transitions.js';

export const VIEW_CROSSFADE_MS = 380;
export const VIEW_HEIGHT_RELEASE_MS = 480;

/** @typedef {'expand-incoming' | 'lock-outgoing' | 'none'} ViewSwapHeightMode */

export function resetViewSwap(viewport) {
  viewport?.classList.remove('is-view-swapping');
  if (!viewport) return;
  viewport.style.minHeight = '';
  viewport.style.transition = '';
}

async function releaseViewportHeight(viewport) {
  if (!viewport) return;
  const end = viewport.scrollHeight;
  viewport.style.transition = `min-height ${VIEW_HEIGHT_RELEASE_MS}ms var(--ease-out-expo)`;
  viewport.style.minHeight = `${end}px`;
  await waitForTransition(viewport, VIEW_HEIGHT_RELEASE_MS + 40);
  viewport.style.transition = '';
  viewport.style.minHeight = '';
}

function applyPanelState(outgoing, incoming) {
  outgoing?.classList.remove('is-active');
  outgoing?.setAttribute('hidden', '');
  outgoing?.setAttribute('aria-hidden', 'true');
  incoming?.classList.add('is-active');
  incoming?.removeAttribute('hidden');
  incoming?.setAttribute('aria-hidden', 'false');
}

/**
 * Crossfade entre deux panneaux dans un .act-map-viewport (liste/carte, wishlist auteur…).
 */
export async function swapViewPanels({
  viewport,
  outgoing,
  incoming,
  mode = 'none',
  animate = true,
  isStale = () => false,
} = {}) {
  if (!viewport || !outgoing || !incoming || outgoing === incoming) return;

  const abortIfStale = () => {
    if (!isStale()) return false;
    resetViewSwap(viewport);
    return true;
  };

  if (!animate) {
    resetViewSwap(viewport);
    applyPanelState(outgoing, incoming);
    return;
  }

  resetViewSwap(viewport);
  viewport.classList.add('is-view-swapping');
  incoming.removeAttribute('hidden');
  incoming.setAttribute('aria-hidden', 'false');

  await nextFrame();
  if (abortIfStale()) return;

  if (mode === 'expand-incoming') {
    incoming.classList.add('is-active', 'is-view-measuring');
    await nextFrame();
    if (abortIfStale()) return;
    const incomingHeight = viewport.scrollHeight;
    if (incomingHeight > 0) viewport.style.minHeight = `${incomingHeight}px`;
    incoming.classList.remove('is-active', 'is-view-measuring');
    outgoing.classList.add('is-active');
    await nextFrame();
    if (abortIfStale()) return;
  } else if (mode === 'lock-outgoing') {
    const lockedHeight = Math.round(viewport.getBoundingClientRect().height);
    if (lockedHeight > 0) viewport.style.minHeight = `${lockedHeight}px`;
  }

  outgoing.classList.remove('is-active');
  incoming.classList.add('is-active');

  await waitForTransition(incoming, VIEW_CROSSFADE_MS);
  if (abortIfStale()) return;

  outgoing.setAttribute('hidden', '');
  outgoing.setAttribute('aria-hidden', 'true');
  viewport.classList.remove('is-view-swapping');

  if (mode === 'lock-outgoing') {
    await releaseViewportHeight(viewport);
  } else {
    viewport.style.transition = '';
    viewport.style.minHeight = '';
  }
}
