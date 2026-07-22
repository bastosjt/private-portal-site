import { NAV_ITEMS, SETTINGS_ITEM } from '../config.js';

export const EXPLORER_ROUTE = 'explorer';
const DEFAULT_ROUTE = 'accueil';
const VALID_ROUTES = new Set([
  ...NAV_ITEMS.map((item) => item.id),
  SETTINGS_ITEM.id,
  EXPLORER_ROUTE,
]);

export function getRouteFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  if (VALID_ROUTES.has(raw)) return raw;
  return DEFAULT_ROUTE;
}

export function routeHref(routeId) {
  return `#${routeId}`;
}

export function mapPlaceHref(categoryId, itemId) {
  return `#carte?place=${encodeURIComponent(`${categoryId}:${itemId}`)}`;
}

export function getMapPlaceFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [route, query] = raw.split('?');
  if (route !== 'carte' || !query) return null;

  const place = new URLSearchParams(query).get('place');
  if (!place) return null;

  const sep = place.indexOf(':');
  if (sep === -1) return null;

  const categoryId = place.slice(0, sep);
  const itemId = place.slice(sep + 1);
  if (!categoryId || !itemId) return null;

  return { categoryId, itemId };
}

export function clearMapPlaceHash() {
  if (!getMapPlaceFromHash()) return;
  window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}#carte`);
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
