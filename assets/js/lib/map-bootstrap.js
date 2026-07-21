export const MAPLIBRE_WORKER_URL = 'assets/js/vendor/maplibre-gl-csp-worker.js';
/** Crossfade tuiles vectorielles au chargement (ms). */
export const MAP_TILE_FADE_MS = 400;

export function getMapLibre() {
  const maplibregl = window.maplibregl;
  if (!maplibregl) return null;
  maplibregl.setWorkerUrl(MAPLIBRE_WORKER_URL);
  return maplibregl;
}

export function waitForContainerSize(container) {
  return new Promise((resolve) => {
    const isReady = () => container.offsetWidth >= 2 && container.offsetHeight >= 2;

    if (isReady()) {
      resolve();
      return;
    }

    const observer = new ResizeObserver(() => {
      if (!isReady()) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(container);

    requestAnimationFrame(() => {
      if (isReady()) {
        observer.disconnect();
        resolve();
        return;
      }

      requestAnimationFrame(() => {
        observer.disconnect();
        resolve();
      });
    });
  });
}
