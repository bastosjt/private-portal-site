import {
  BASE_THEME,
  MAP_THEME,
  NAV_ITEMS,
  SETTINGS_ITEM,
  SETTINGS_THEME,
} from '../config.js';
import { EXPLORER_ROUTE, navigate } from '../navigation/router.js';
import { renderNavIcon } from '../lib/lucide-icon.js';

const HEADER_SWAP_MS = 220; // aligné sur --duration-page-leave

const EXPLORER_CHILD_ROUTES = new Set(
  NAV_ITEMS
    .map((item) => item.id)
    .filter((id) => id !== 'accueil' && id !== 'carte'),
);

/** Métadonnées header par route. */
const ROUTE_HEADERS = {
  accueil: {
    title: 'Bonjour',
    sub: 'Chargement…',
    icon: 'home',
    theme: BASE_THEME,
    showBack: false,
  },
  carte: {
    title: 'Carte interactive',
    sub: 'Activités, restaurants et voyages',
    icon: 'map',
    theme: MAP_THEME,
    showBack: false,
  },
  [EXPLORER_ROUTE]: {
    title: 'Explorer',
    sub: 'Parcourir par catégorie',
    icon: 'layout-grid',
    theme: BASE_THEME,
    showBack: false,
  },
  parametres: {
    title: SETTINGS_ITEM.label,
    sub: 'Votre compte · Our Space',
    icon: SETTINGS_ITEM.icon,
    theme: SETTINGS_THEME,
    showBack: false,
  },
};

for (const item of NAV_ITEMS) {
  if (ROUTE_HEADERS[item.id]) continue;
  ROUTE_HEADERS[item.id] = {
    title: item.label,
    sub: '-',
    icon: item.icon,
    theme: item.theme || BASE_THEME,
    showBack: EXPLORER_CHILD_ROUTES.has(item.id),
  };
}

let headerRoot = null;
let headerEl = null;
let titleEl = null;
let subEl = null;
let iconEl = null;
let backBtn = null;
let swapToken = 0;
let customBackHandler = null;
let currentState = {
  title: '',
  sub: '',
  icon: '',
  theme: BASE_THEME,
  showBack: false,
};

function menuIconHtml() {
  return renderNavIcon('menu', { strokeWidth: 1.75 });
}

function backIconHtml() {
  return renderNavIcon('chevron-left', { strokeWidth: 2, width: 20, height: 20 });
}

function resolveRouteHeader(routeId) {
  if (ROUTE_HEADERS[routeId]) return { ...ROUTE_HEADERS[routeId] };
  const navItem = NAV_ITEMS.find((item) => item.id === routeId);
  if (navItem) {
    return {
      title: navItem.label,
      sub: 'Bientôt disponible',
      icon: navItem.icon,
      theme: navItem.theme || BASE_THEME,
      showBack: false,
    };
  }
  return {
    title: 'Our Space',
    sub: '',
    icon: 'home',
    theme: BASE_THEME,
    showBack: false,
  };
}

function applyTheme(theme) {
  if (!headerEl) return;
  if (theme) headerEl.setAttribute('data-theme', theme);
  else headerEl.removeAttribute('data-theme');
  iconEl?.setAttribute('data-theme', theme || BASE_THEME);
  backBtn?.setAttribute('data-theme', theme || BASE_THEME);
}

function applyStatic(next) {
  if (titleEl && next.title != null) titleEl.textContent = next.title;
  if (subEl && next.sub != null) subEl.textContent = next.sub;
  if (iconEl && next.icon) {
    iconEl.innerHTML = renderNavIcon(next.icon, { strokeWidth: 1.75 });
  }
  if (typeof next.showBack === 'boolean' && backBtn) {
    backBtn.hidden = !next.showBack;
    backBtn.setAttribute('aria-hidden', next.showBack ? 'false' : 'true');
  }
  if (next.theme) applyTheme(next.theme);

  currentState = {
    title: next.title ?? currentState.title,
    sub: next.sub ?? currentState.sub,
    icon: next.icon ?? currentState.icon,
    theme: next.theme ?? currentState.theme,
    showBack: typeof next.showBack === 'boolean' ? next.showBack : currentState.showBack,
  };
}

async function swapContent(patch, { animate = true } = {}) {
  if (!headerEl) return;

  const next = {
    title: patch.title ?? currentState.title,
    sub: patch.sub ?? currentState.sub,
    icon: patch.icon ?? currentState.icon,
    theme: patch.theme ?? currentState.theme,
    showBack: typeof patch.showBack === 'boolean' ? patch.showBack : currentState.showBack,
  };

  const changed = (
    next.title !== currentState.title
    || next.sub !== currentState.sub
    || next.icon !== currentState.icon
    || next.theme !== currentState.theme
    || next.showBack !== currentState.showBack
  );

  if (!changed) return;

  if (!animate) {
    applyStatic(next);
    return;
  }

  const token = beginPageHeaderSwap();
  await new Promise((resolve) => setTimeout(resolve, HEADER_SWAP_MS));
  if (token == null || token !== swapToken) return;
  applyStatic(next);
  revealPageHeader(token);
}

/** Début du crossfade header (sortie) — à lancer avec le leave de page. */
export function beginPageHeaderSwap() {
  if (!headerEl) return null;
  const token = ++swapToken;
  headerEl.classList.add('is-swapping');
  return token;
}

/** Applique le contenu de route pendant que le header est masqué. */
export function commitPageHeaderForRoute(routeId) {
  clearPageHeaderBackHandler();
  applyStatic(resolveRouteHeader(routeId));
}

/** Fin du crossfade header (entrée) — à lancer avec l’enter de page. */
export function revealPageHeader(token) {
  if (!headerEl) return;
  if (token != null && token !== swapToken) return;
  headerEl.classList.remove('is-swapping');
}

function onBackClick() {
  if (typeof customBackHandler === 'function') {
    customBackHandler();
    return;
  }
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  navigate(EXPLORER_ROUTE);
}

export function renderPageHeader(root = document.getElementById('page-header-root')) {
  headerRoot = root;
  if (!headerRoot) return;

  headerRoot.innerHTML = `
    <header class="page-header page-header--themed" id="app-page-header" data-theme="${BASE_THEME}">
      <button type="button" class="btn-menu" id="menu-toggle" aria-label="Ouvrir le menu">
        ${menuIconHtml()}
      </button>
      <div class="page-header-mobile-group">
        <button
          type="button"
          class="page-header-mobile-icon page-header-back"
          id="page-header-back"
          data-theme="${BASE_THEME}"
          aria-label="Retour"
          hidden
        >
          ${backIconHtml()}
        </button>
        <div class="page-header-mobile-icon" id="page-header-icon" data-theme="${BASE_THEME}" aria-hidden="true">
          ${renderNavIcon('home', { strokeWidth: 1.75 })}
        </div>
      </div>
      <div class="page-header-content">
        <h1 class="page-header-title" id="page-header-title">Our Space</h1>
        <p class="page-header-sub" id="page-header-sub"></p>
      </div>
    </header>
  `;

  headerEl = headerRoot.querySelector('#app-page-header');
  titleEl = headerRoot.querySelector('#page-header-title');
  subEl = headerRoot.querySelector('#page-header-sub');
  iconEl = headerRoot.querySelector('#page-header-icon');
  backBtn = headerRoot.querySelector('#page-header-back');

  backBtn?.addEventListener('click', onBackClick);

  applyStatic(resolveRouteHeader('accueil'));
}

/** Met à jour le header pour une route (animé au changement de page). */
export function setPageHeaderForRoute(routeId, { animate = true } = {}) {
  clearPageHeaderBackHandler();
  return swapContent(resolveRouteHeader(routeId), { animate });
}

export function setPageHeader(patch, { animate = true } = {}) {
  return swapContent(patch, { animate });
}

export function setPageHeaderTitle(title, { animate = true } = {}) {
  return swapContent({ title }, { animate });
}

export function setPageHeaderSub(sub, { animate = false } = {}) {
  return swapContent({ sub }, { animate });
}

export function setPageHeaderBackHandler(handler) {
  customBackHandler = typeof handler === 'function' ? handler : null;
}

export function clearPageHeaderBackHandler() {
  customBackHandler = null;
}

export function getPageHeaderSubEl() {
  return subEl;
}

export function getPageHeaderTitleEl() {
  return titleEl;
}
