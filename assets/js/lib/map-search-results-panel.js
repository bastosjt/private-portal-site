const OPEN_MS = 380;
const CLOSE_MS = 280;
const UPDATE_MS = 340;
const OPEN_OPACITY_MS = 320;
const CLOSE_OPACITY_MS = 220;

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let panelAnimToken = 0;

function nextPanelAnimToken() {
  panelAnimToken += 1;
  return panelAnimToken;
}

function isCurrentPanelAnim(token) {
  return token === panelAnimToken;
}

function clearPanelMotionStyles(el) {
  el.style.height = '';
  el.style.opacity = '';
  el.style.transform = '';
  el.style.transition = '';
  el.style.overflow = '';
}

function measurePanelHeight(el) {
  clearPanelMotionStyles(el);
  el.style.height = 'auto';
  const height = el.getBoundingClientRect().height;
  el.style.height = '';
  return height;
}

function waitPanelMotion(ms, token, callback) {
  if (prefersReducedMotion()) {
    callback();
    return;
  }
  window.setTimeout(() => {
    if (!isCurrentPanelAnim(token)) return;
    callback();
  }, ms);
}

function setOpenTransition(el) {
  el.style.overflow = 'hidden';
  if (prefersReducedMotion()) {
    el.style.transition = 'none';
    return;
  }
  el.style.transition = [
    `height ${OPEN_MS}ms var(--ease-premium)`,
    `opacity ${OPEN_OPACITY_MS}ms var(--ease-premium) 45ms`,
    `transform ${OPEN_MS}ms var(--ease-premium)`,
  ].join(', ');
}

function setCloseTransition(el) {
  el.style.overflow = 'hidden';
  if (prefersReducedMotion()) {
    el.style.transition = 'none';
    return;
  }
  el.style.transition = [
    `height ${CLOSE_MS}ms var(--ease-page-leave)`,
    `opacity ${CLOSE_OPACITY_MS}ms var(--ease-page-leave)`,
    `transform ${CLOSE_MS}ms var(--ease-page-leave)`,
  ].join(', ');
}

function setUpdateTransition(el) {
  el.style.overflow = 'hidden';
  if (prefersReducedMotion()) {
    el.style.transition = 'none';
    return;
  }
  el.style.transition = `height ${UPDATE_MS}ms var(--ease-premium)`;
}

function runPanelFrame(callback) {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

export function forceCloseMapSearchResultsPanel(resultsEl) {
  nextPanelAnimToken();
  resultsEl.classList.add('hidden');
  resultsEl.classList.remove('is-panel-open', 'is-panel-animating');
  resultsEl.innerHTML = '';
  clearPanelMotionStyles(resultsEl);
}

export function openMapSearchResultsPanel(resultsEl, { html } = {}) {
  const token = nextPanelAnimToken();
  resultsEl.innerHTML = html;
  resultsEl.classList.remove('hidden');
  resultsEl.classList.add('is-panel-open');

  if (prefersReducedMotion()) {
    clearPanelMotionStyles(resultsEl);
    return;
  }

  const targetHeight = measurePanelHeight(resultsEl);
  setOpenTransition(resultsEl);
  resultsEl.classList.add('is-panel-animating');
  resultsEl.style.height = '0px';
  resultsEl.style.opacity = '0';
  resultsEl.style.transform = 'translate3d(0, -5px, 0)';

  runPanelFrame(() => {
    if (!isCurrentPanelAnim(token)) return;
    resultsEl.style.height = `${targetHeight}px`;
    resultsEl.style.opacity = '1';
    resultsEl.style.transform = 'translate3d(0, 0, 0)';
    waitPanelMotion(OPEN_MS, token, () => {
      resultsEl.style.height = 'auto';
      resultsEl.classList.remove('is-panel-animating');
      clearPanelMotionStyles(resultsEl);
    });
  });
}

export function updateMapSearchResultsPanel(resultsEl, { html } = {}) {
  if (resultsEl.classList.contains('hidden')) {
    openMapSearchResultsPanel(resultsEl, { html });
    return;
  }

  const token = nextPanelAnimToken();

  if (prefersReducedMotion()) {
    resultsEl.innerHTML = html;
    return;
  }

  const startHeight = resultsEl.getBoundingClientRect().height;
  resultsEl.innerHTML = html;
  const endHeight = measurePanelHeight(resultsEl);

  if (Math.abs(endHeight - startHeight) < 1) {
    clearPanelMotionStyles(resultsEl);
    return;
  }

  setUpdateTransition(resultsEl);
  resultsEl.classList.add('is-panel-animating');
  resultsEl.style.height = `${startHeight}px`;
  resultsEl.style.opacity = '1';
  resultsEl.style.transform = 'translate3d(0, 0, 0)';

  runPanelFrame(() => {
    if (!isCurrentPanelAnim(token)) return;
    resultsEl.style.height = `${endHeight}px`;
    waitPanelMotion(UPDATE_MS, token, () => {
      resultsEl.style.height = 'auto';
      resultsEl.classList.remove('is-panel-animating');
      clearPanelMotionStyles(resultsEl);
    });
  });
}

export function closeMapSearchResultsPanel(resultsEl, { onDone } = {}) {
  if (resultsEl.classList.contains('hidden')) {
    onDone?.();
    return;
  }

  const token = nextPanelAnimToken();

  if (prefersReducedMotion()) {
    forceCloseMapSearchResultsPanel(resultsEl);
    onDone?.();
    return;
  }

  setCloseTransition(resultsEl);
  resultsEl.classList.add('is-panel-animating');
  resultsEl.style.height = `${resultsEl.getBoundingClientRect().height}px`;
  resultsEl.style.opacity = '1';
  resultsEl.style.transform = 'translate3d(0, 0, 0)';

  runPanelFrame(() => {
    if (!isCurrentPanelAnim(token)) return;
    resultsEl.style.height = '0px';
    resultsEl.style.opacity = '0';
    resultsEl.style.transform = 'translate3d(0, -4px, 0)';
    waitPanelMotion(CLOSE_MS, token, () => {
      forceCloseMapSearchResultsPanel(resultsEl);
      onDone?.();
    });
  });
}
