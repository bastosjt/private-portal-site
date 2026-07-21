import { ensureMapDataReady, getMapMarkersFromCache } from '../../data/appDataCache.js';
import { preloadMapMarkerImages, resetMapMarkerImages } from './map-marker-images.js';

let warmupPromise = null;
let mapWarmReady = false;

export function isMapWarmReady() {
  return mapWarmReady;
}

/** Données + icônes pins prêtes pour la page Carte (une fois l’accueil chargé). */
export function warmMapForApp() {
  if (mapWarmReady) return Promise.resolve();
  if (warmupPromise) return warmupPromise;

  warmupPromise = (async () => {
    await ensureMapDataReady();
    await preloadMapMarkerImages(getMapMarkersFromCache());
    mapWarmReady = true;
  })().catch((err) => {
    console.warn('warmMapForApp:', err.message);
    warmupPromise = null;
  });

  return warmupPromise;
}

export function resetMapWarmup() {
  warmupPromise = null;
  mapWarmReady = false;
  resetMapMarkerImages();
}
