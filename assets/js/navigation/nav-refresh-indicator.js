import { renderLoaderCircleIcon } from '../lib/lucide-icon.js';
import { resolveNavTabId } from './nav-request.js';

const MIN_LOADER_MS = 420;
const CROSSFADE_MS = 380;
const LOADER_HTML = renderLoaderCircleIcon({ strokeWidth: 2.25, width: 20, height: 20 });

let loaderToken = 0;

export function renderNavIconLoaderHtml() {
  return `<span class="nav-icon-loader" aria-hidden="true">${LOADER_HTML}</span>`;
}

function setRefreshing(el, active) {
  if (!el) return;
  el.classList.toggle('is-refreshing', active);
  if (active) {
    el.classList.remove('is-refreshing-exit');
    el.setAttribute('aria-busy', 'true');
    return;
  }
  el.removeAttribute('aria-busy');
}

function setRefreshingExit(el, active) {
  if (!el) return;
  el.classList.toggle('is-refreshing-exit', active);
}

function nextFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getRefreshTargets(routeId) {
  const bottomTabId = resolveNavTabId(routeId);
  return {
    bottomItem: document.querySelector(`.bottom-nav-item[data-route="${bottomTabId}"]`),
    sidebarLink: document.querySelector(`.sidebar-link[data-route="${routeId}"]`),
  };
}

async function beginExit(bottomItem, sidebarLink) {
  setRefreshingExit(bottomItem, true);
  setRefreshingExit(sidebarLink, true);
  setRefreshing(bottomItem, false);
  setRefreshing(sidebarLink, false);
  await nextFrame();
}

/** Affiche un loader sur l’icône nav active le temps du refresh (retap onglet). */
export async function withNavRefreshIndicator(routeId, task) {
  const token = ++loaderToken;
  const { bottomItem, sidebarLink } = getRefreshTargets(routeId);

  setRefreshing(bottomItem, true);
  setRefreshing(sidebarLink, true);
  await nextFrame();

  try {
    await Promise.all([
      Promise.resolve(task),
      wait(MIN_LOADER_MS),
    ]);
  } finally {
    if (token !== loaderToken) return;

    await beginExit(bottomItem, sidebarLink);
    await wait(CROSSFADE_MS);

    if (token !== loaderToken) return;
    setRefreshingExit(bottomItem, false);
    setRefreshingExit(sidebarLink, false);
  }
}
