import { BASE_THEME, NAV_ITEMS } from './config.js';
import { EXPLORER_ROUTE, getRouteFromHash } from './navigation/router.js';
import { renderNavIcon } from './lib/lucide-icon.js';

/** Routes catégories accessibles via Explorer → l’onglet Explorer reste actif. */
const EXPLORER_CHILD_ROUTES = new Set(
  NAV_ITEMS
    .map((item) => item.id)
    .filter((id) => id !== 'accueil' && id !== 'carte'),
);

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
    height="88"
    viewBox="0 0 620 88"
    fill="none"
    overflow="visible"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <rect y="24" width="620" height="64" fill="currentColor"/>
    <path d="M310 6C318.095 6 325.565 8.70945 331.578 13.2824C338.667 18.6742 346.518 24 355.424 24H480V88H140V24H264.576C273.482 24 281.333 18.6742 288.422 13.2824C294.435 8.70945 301.905 6 310 6Z" fill="currentColor"/>
    <path d="M0 24H140H264.576C273.482 24 281.333 18.6742 288.422 13.2824C294.435 8.70945 301.905 6 310 6C318.095 6 325.565 8.70945 331.578 13.2824C338.667 18.6742 346.518 24 355.424 24H480H620" stroke="rgba(255,255,255,0.06)" stroke-width="1" vector-effect="non-scaling-stroke"/>
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

function renderExplorerBadge(routeId) {
  const pageItem = resolveExplorerPageItem(routeId);
  if (!pageItem) {
    return '<span class="bottom-nav-explorer-badge" data-explorer-badge hidden></span>';
  }
  return `
    <span class="bottom-nav-explorer-badge" data-explorer-badge>
      ${renderPageBadgeHtml(pageItem)}
    </span>
  `;
}

function renderRouteItem(routeId, label, iconName, activeId, routeIdForBadge = null) {
  const isActive = routeId === activeId;
  const badgeHtml = routeId === EXPLORER_ROUTE && routeIdForBadge != null
    ? renderExplorerBadge(routeIdForBadge)
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
        ${badgeHtml}
      </span>
    </a>
  `;
}

function syncExplorerBadge(routeId = getActiveId()) {
  const host = document.querySelector('.bottom-nav-item[data-route="explorer"] [data-explorer-badge]');
  if (!host) return;

  const pageItem = resolveExplorerPageItem(routeId);
  if (!pageItem) {
    host.innerHTML = '';
    host.hidden = true;
    return;
  }

  host.innerHTML = renderPageBadgeHtml(pageItem);
  host.hidden = false;
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
          ${renderRouteItem('parametres', 'Réglages', 'settings', navActiveId)}
        </div>
      </div>
    </nav>
  `;
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

  document.querySelectorAll('.bottom-nav-item[data-route]').forEach((item) => {
    item.addEventListener('click', (event) => {
      const routeId = item.dataset.route;
      if (!routeId || !onNavigate) return;
      event.preventDefault();
      onNavigate(routeId);
    });
  });

  fabBtn?.addEventListener('click', () => {
    fabBtn.classList.add('is-pressed');
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
    }
    onAdd?.();
    window.requestAnimationFrame(() => {
      fabBtn.classList.remove('is-pressed');
    });
  });
}
