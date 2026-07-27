import { NAV_ITEMS } from '../config.js';
import { EXPLORER_ROUTE, getRouteFromHash, navigate } from './router.js';

/** Routes catégories rattachées à l’onglet Explorer (bottom nav). */
export const EXPLORER_CHILD_ROUTES = new Set(
  NAV_ITEMS
    .map((item) => item.id)
    .filter((id) => id !== 'accueil' && id !== 'carte'),
);

/** Onglet bottom-nav actif pour une route. */
export function resolveNavTabId(routeId) {
  if (EXPLORER_CHILD_ROUTES.has(routeId)) return EXPLORER_ROUTE;
  return routeId;
}

/**
 * Retap sur un onglet déjà actif → refresh léger.
 * L’onglet Explorer couvre aussi les sous-pages (activités, restos…) :
 * retap = refresh de la page courante (le retour hub passe par le bouton retour).
 */
export function resolveNavAction(targetRouteId, currentRoute = getRouteFromHash()) {
  if (targetRouteId === currentRoute) {
    return 'refresh';
  }

  if (targetRouteId === EXPLORER_ROUTE && EXPLORER_CHILD_ROUTES.has(currentRoute)) {
    return 'refresh';
  }

  return 'navigate';
}

export function navigateToRoute(routeId, options) {
  return navigate(routeId, options);
}
