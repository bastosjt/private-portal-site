import { NAV_ITEMS, SETTINGS_ITEM } from '../config.js';

const DEFAULT_ROUTE = 'accueil';
const VALID_ROUTES = new Set([...NAV_ITEMS.map((item) => item.id), SETTINGS_ITEM.id]);

export function getRouteFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  if (VALID_ROUTES.has(raw)) return raw;
  return DEFAULT_ROUTE;
}

export function routeHref(routeId) {
  return `#${routeId}`;
}

export function navigate(routeId, { replace = false } = {}) {
  const id = VALID_ROUTES.has(routeId) ? routeId : DEFAULT_ROUTE;
  const target = routeHref(id);

  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return id;
  }

  if (replace) {
    window.location.replace(`${window.location.pathname}${window.location.search}${target}`);
  } else {
    window.location.hash = id;
  }

  return id;
}

export function initRouter(onRouteChange) {
  const handleRoute = () => {
    onRouteChange(getRouteFromHash());
  };

  window.addEventListener('hashchange', handleRoute);

  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  const routeId = getRouteFromHash();

  if (!raw || !VALID_ROUTES.has(raw)) {
    navigate(routeId, { replace: true });
  } else {
    handleRoute();
  }

  return () => window.removeEventListener('hashchange', handleRoute);
}
