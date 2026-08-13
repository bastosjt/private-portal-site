import { BASE_THEME, NAV_ITEMS } from './config.js';
import { EXPLORER_ROUTE, getRouteFromHash } from './navigation/router.js';
import { EXPLORER_CHILD_ROUTES } from './navigation/nav-request.js';
import { renderNavIcon } from './lib/lucide-icon.js';
import { renderNavIconLoaderHtml } from './navigation/nav-refresh-indicator.js';

function icon(name, strokeWidth) {
  return renderNavIcon(name, strokeWidth != null ? { strokeWidth } : {});
}

function fabIcon() {
  return renderNavIcon('plus', { strokeWidth: 2, width: 24, height: 24 });
}

/** Forme notch inline pour hériter de `color: var(--surface)`. */
const BOTTOM_NAV_SHAPE_SVG = `
  <svg
    class="bottom-nav-shape"
    width="620"
    height="142.68"
    viewBox="0 0 620 142.68"
    fill="none"
    overflow="visible"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <rect y="24" width="620" height="118.68" fill="currentColor"/>
    <path d="M310,6c8.1,0,15.57,2.71,21.58,7.28,7.09,5.39,14.94,10.72,23.85,10.72h124.58v64H140V24h124.58c8.91,0,16.76-5.33,23.85-10.72,6.01-4.57,13.48-7.28,21.58-7.28Z" fill="currentColor"/>
    <path d="M0,24h264.58c8.91,0,16.76-5.33,23.85-10.72,6.01-4.57,13.48-7.28,21.58-7.28s15.57,2.71,21.58,7.28c7.09,5.39,14.94,10.72,23.85,10.72h264.58" stroke="rgba(255,255,255,0.06)" stroke-width="1" vector-effect="non-scaling-stroke"/>
  </svg>
`;

function getActiveId() {
  return getRouteFromHash();
}

/** Mappe la route courante vers l’onglet bottom-nav à highlighter. */
function resolveBottomNavActiveId(routeId = getActiveId()) {
  if (EXPLORER_CHILD_ROUTES.has(routeId)) return EXPLORER_ROUTE;
  return routeId;
}

function resolveExplorerPageItem(routeId = getActiveId()) {
  if (!EXPLORER_CHILD_ROUTES.has(routeId)) return null;
  return NAV_ITEMS.find((item) => item.id === routeId) || null;
}

/** Pastille = disque gris carte + icône/couleur de la page courante. */
function renderPageBadgeHtml(navItem) {
  return `
    <span
      class="bottom-nav-page-badge"
      data-theme="${navItem.theme || BASE_THEME}"
      title="${navItem.label}"
      aria-hidden="true"
    >${renderNavIcon(navItem.icon, { strokeWidth: 2.25, width: 14, height: 14 })}</span>
  `.trim();
}

function renderExplorerBadge(routeId, { animateIn = false } = {}) {
  const pageItem = resolveExplorerPageItem(routeId);
  if (!pageItem) {
    return '<span class="bottom-nav-explorer-badge" data-explorer-badge hidden></span>';
  }
  return `
    <span
      class="bottom-nav-explorer-badge${animateIn ? ' is-badge-enter' : ''}"
      data-explorer-badge
      data-badge-route="${pageItem.id}"
    >
      ${renderPageBadgeHtml(pageItem)}
    </span>
  `;
}

function renderRouteItem(routeId, label, iconName, activeId, routeIdForBadge = null) {
  const isActive = routeId === activeId;
  const badgeHtml = routeId === EXPLORER_ROUTE && routeIdForBadge != null
    ? renderExplorerBadge(routeIdForBadge, { animateIn: Boolean(resolveExplorerPageItem(routeIdForBadge)) })
    : '';

  return `
    <a
      href="#${routeId}"
      class="bottom-nav-item${isActive ? ' is-active' : ''}"
      data-route="${routeId}"
      aria-label="${label}"
      ${isActive ? ' aria-current="page"' : ''}
    >
      <span class="sidebar-link-icon" aria-hidden="true">
        <span class="bottom-nav-icon-glyph">
          ${icon(iconName, 1.75)}
        </span>
        ${renderNavIconLoaderHtml()}
        ${badgeHtml}
      </span>
    </a>
  `;
}

const BADGE_ENTER_MS = 440;
const BADGE_LEAVE_MS = 240;
const BADGE_SWAP_OUT_MS = 200;

let badgeAnimToken = 0;

function clearBadgeAnimClasses(host) {
  host.classList.remove('is-badge-enter', 'is-badge-leave', 'is-badge-swap-out', 'is-badge-swap-in');
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function syncExplorerBadge(routeId = getActiveId()) {
  const host = document.querySelector('.bottom-nav-item[data-route="explorer"] [data-explorer-badge]');
  if (!host) return;

  const token = ++badgeAnimToken;
  const pageItem = resolveExplorerPageItem(routeId);
  const nextKey = pageItem?.id || '';

  if (!pageItem) {
    if (host.hidden) return;
    clearBadgeAnimClasses(host);
    host.classList.add('is-badge-leave');
    await wait(BADGE_LEAVE_MS);
    if (token !== badgeAnimToken) return;
    host.innerHTML = '';
    host.hidden = true;
    host.dataset.badgeRoute = '';
    clearBadgeAnimClasses(host);
    return;
  }

  const prevKey = host.dataset.badgeRoute || '';

  if (host.hidden || !prevKey) {
    host.dataset.badgeRoute = nextKey;
    host.innerHTML = renderPageBadgeHtml(pageItem);
    host.hidden = false;
    clearBadgeAnimClasses(host);
    host.classList.add('is-badge-enter');
    await wait(BADGE_ENTER_MS);
    if (token !== badgeAnimToken) return;
    clearBadgeAnimClasses(host);
    return;
  }

  if (prevKey === nextKey) {
    if (host.classList.contains('is-badge-enter')) {
      await wait(BADGE_ENTER_MS);
      if (token !== badgeAnimToken) return;
      host.classList.remove('is-badge-enter');
    }
    return;
  }

  clearBadgeAnimClasses(host);
  host.classList.add('is-badge-swap-out');
  await wait(BADGE_SWAP_OUT_MS);
  if (token !== badgeAnimToken) return;

  host.dataset.badgeRoute = nextKey;
  host.innerHTML = renderPageBadgeHtml(pageItem);
  host.classList.remove('is-badge-swap-out');
  host.classList.add('is-badge-swap-in');
  await wait(BADGE_ENTER_MS);
  if (token !== badgeAnimToken) return;
  clearBadgeAnimClasses(host);
}

function ensureBottomNavGlass(shell) {
  if (!shell || shell.querySelector('.bottom-nav-glass')) return;
  const glass = document.createElement('div');
  glass.className = 'bottom-nav-glass';
  glass.setAttribute('aria-hidden', 'true');
  shell.insertBefore(glass, shell.firstChild);
}

export function renderBottomNav(container, { activeId = getActiveId() } = {}) {
  const navActiveId = resolveBottomNavActiveId(activeId);

  container.innerHTML = `
    <nav class="bottom-nav" id="bottom-nav" aria-label="Navigation mobile">
      <div class="bottom-nav-shell">
        ${BOTTOM_NAV_SHAPE_SVG}
        <button type="button" class="bottom-nav-fab" id="bottom-nav-fab" aria-label="Ajouter">
          ${fabIcon()}
        </button>

        <div class="bottom-nav-bar">
          ${renderRouteItem('accueil', 'Accueil', 'home', navActiveId)}
          ${renderRouteItem(EXPLORER_ROUTE, 'Explorer', 'layout-grid', navActiveId, activeId)}
          <span class="bottom-nav-fab-anchor" aria-hidden="true"></span>
          ${renderRouteItem('carte', 'Carte', 'map', navActiveId)}
          ${renderRouteItem('parametres', 'Profil', 'user', navActiveId)}
        </div>
      </div>
    </nav>
  `;

  ensureBottomNavGlass(container.querySelector('.bottom-nav-shell'));
}

export function updateBottomNavActive(activeId = getActiveId()) {
  const navActiveId = resolveBottomNavActiveId(activeId);

  document.querySelectorAll('.bottom-nav-item[data-route]').forEach((item) => {
    const isActive = item.dataset.route === navActiveId;
    item.classList.toggle('is-active', isActive);
    if (isActive) {
      item.setAttribute('aria-current', 'page');
    } else {
      item.removeAttribute('aria-current');
    }
  });

  syncExplorerBadge(activeId);
}

export function initBottomNav({ onNavigate, onAdd } = {}) {
  const fabBtn = document.getElementById('bottom-nav-fab');
  let fabOpening = false;

  document.querySelectorAll('.bottom-nav-item[data-route]').forEach((item) => {
    item.addEventListener('click', (event) => {
      const routeId = item.dataset.route;
      if (!routeId || !onNavigate) return;
      event.preventDefault();
      onNavigate(routeId);
    });
  });

  fabBtn?.addEventListener('click', () => {
    if (fabOpening || !onAdd) return;
    fabOpening = true;

    fabBtn.classList.add('is-pressed');
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
    }

    // Ouverture immédiate : le press chevauche la montée du sheet (pas de latence).
    onAdd();

    window.setTimeout(() => {
      fabBtn.classList.remove('is-pressed');
      fabOpening = false;
    }, 420);
  });
}
