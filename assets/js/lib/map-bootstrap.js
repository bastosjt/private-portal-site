export const MAPLIBRE_WORKER_URL = 'assets/js/vendor/maplibre-gl-csp-worker.js';

/** Tuiles raster Carto — 1 requête par tuile visible (vs dizaines en vectoriel + glyphes). */
export const MAP_RASTER_TILES = 'https://basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}@2x.png';
export const MAP_RASTER_TILES_LABELED = 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png';

/** Options communes pour limiter le prefetch tuiles. */
export const MAP_BASE_OPTS = {
  renderWorldCopies: false,
  attributionControl: false,
  fadeDuration: 0,
  refreshExpiredTiles: false,
  maxTileCacheSize: 64,
};

let mapLibreLoadPromise = null;

function ensureMapLibreCss() {
  if (document.querySelector('link[data-maplibre-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'assets/css/maplibre-gl.css?v=1';
  link.dataset.maplibreCss = '1';
  document.head.appendChild(link);
}

export async function loadMapLibre() {
  ensureMapLibreCss();
  if (window.maplibregl) {
    window.maplibregl.setWorkerUrl(MAPLIBRE_WORKER_URL);
    return window.maplibregl;
  }

  if (!mapLibreLoadPromise) {
    mapLibreLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'assets/js/vendor/maplibre-gl.js?v=1';
      script.onload = () => {
        if (window.maplibregl) {
          window.maplibregl.setWorkerUrl(MAPLIBRE_WORKER_URL);
          resolve(window.maplibregl);
        } else {
          reject(new Error('MapLibre indisponible'));
        }
      };
      script.onerror = () => reject(new Error('Échec chargement MapLibre'));
      document.head.appendChild(script);
    });
  }

  return mapLibreLoadPromise;
}

/** @deprecated Préférer loadMapLibre() — retourne null si le script n'est pas encore chargé. */
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
