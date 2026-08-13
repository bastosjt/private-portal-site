export const MAPLIBRE_WORKER_URL = 'assets/js/vendor/maplibre-gl-csp-worker.js';
/** Crossfade tuiles vectorielles au chargement (ms). */
export const MAP_TILE_FADE_MS = 680;
export const MAP_REVEAL_MS = 720;

function prefersReducedMapMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function revealMapCanvasWhenIdle(map, root, { skipLoadingVeil = false } = {}) {
  if (!map || !root) return () => {};

  let cancelled = false;

  if (!skipLoadingVeil) {
    root.classList.remove('is-map-ready');
    root.classList.add('is-map-loading');
  } else {
    root.classList.remove('is-map-loading');
    root.classList.add('is-map-ready');
  }

  const reveal = () => {
    if (cancelled) return;
    root.classList.remove('is-map-loading');
    root.classList.add('is-map-ready');
  };

  const waitIdle = () => {
    if (cancelled) return;

    if (prefersReducedMapMotion() || skipLoadingVeil) {
      reveal();
      return;
    }

    const finish = () => {
      requestAnimationFrame(() => {
        if (!cancelled) reveal();
      });
    };

    if (typeof map.areTilesLoaded === 'function' && map.areTilesLoaded() && !map.isMoving()) {
      finish();
      return;
    }

    map.once('idle', finish);
  };

  if (map.isStyleLoaded()) {
    waitIdle();
  } else {
    map.once('load', waitIdle);
  }

  return () => {
    cancelled = true;
  };
}

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
