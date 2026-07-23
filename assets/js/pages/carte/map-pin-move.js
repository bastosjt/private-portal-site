import { getCategoryById } from '../../config.js';
import { updateItem } from '../../firebase/firestore.js';
import { syncCachedItemWrite } from '../../data/appDataCache.js';
import { getMapLibre } from '../../lib/map-bootstrap.js';
import { devError } from '../../lib/dev-log.js';
import { clearHiddenMapMarker, setHiddenMapMarker } from './map-markers.js';
import { getMarkerPinColor } from './map-marker-images.js';

/** Même path que les pins GeoJSON (tête + pic bas). */
const PIN_PATH = 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0';
const MARKER_FILL = '#1f2229';

let activeSession = null;

function getThemeAttr(categoryId) {
  return getCategoryById(categoryId)?.theme || 'base';
}

function buildPinEl(categoryId) {
  const color = getMarkerPinColor({ categoryId });
  const el = document.createElement('div');
  el.className = 'map-pin-move-marker';
  el.dataset.theme = getThemeAttr(categoryId);
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <svg class="map-pin-move-marker-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path
        d="${PIN_PATH}"
        fill="${MARKER_FILL}"
        stroke="${color}"
        stroke-width="1.1"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle cx="12" cy="10" r="3.2" fill="${color}" />
    </svg>
  `;
  return el;
}

function buildBarEl({ theme }) {
  const bar = document.createElement('div');
  bar.className = 'map-pin-move-bar';
  bar.dataset.theme = theme;
  bar.innerHTML = `
    <p class="map-pin-move-hint">Déplacez la carte pour positionner le pin</p>
    <div class="map-pin-move-actions">
      <button type="button" class="map-pin-move-btn map-pin-move-btn--cancel" data-action="cancel">Annuler</button>
      <button type="button" class="map-pin-move-btn map-pin-move-btn--confirm" data-action="confirm">Valider</button>
    </div>
  `;
  return bar;
}

function getHostEl(map) {
  return map?.getContainer()?.closest('.map-panel-body')
    || map?.getContainer()?.parentElement
    || map?.getContainer();
}

function readMapCenter(map) {
  const center = map.getCenter();
  return { lng: center.lng, lat: center.lat };
}

export function isMapPinMoveActive() {
  return Boolean(activeSession);
}

export function stopMapPinMove({ restore = true } = {}) {
  if (!activeSession) return;

  const { map, pinEl, bar, onMapMove, abort } = activeSession;
  abort?.abort();

  if (map && onMapMove) {
    map.off('move', onMapMove);
  }

  pinEl?.remove();
  bar?.remove();

  if (restore && map) {
    clearHiddenMapMarker(map);
  }

  document.body.classList.remove('map-pin-move-active');
  activeSession = null;
}

export async function startMapPinMove({
  map,
  categoryId,
  item,
  onSaved,
  onCancel,
} = {}) {
  stopMapPinMove({ restore: true });

  const maplibregl = getMapLibre();
  if (!map || !maplibregl || !item?.id) return false;

  const lng = Number(item.longitude);
  const lat = Number(item.latitude);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;

  const theme = getThemeAttr(categoryId);
  const host = getHostEl(map);
  const abort = new AbortController();
  let isSaving = false;

  setHiddenMapMarker(map, { categoryId, itemId: item.id });

  const pinEl = buildPinEl(categoryId);
  const bar = buildBarEl({ theme });
  host?.appendChild(pinEl);
  host?.appendChild(bar);

  const finishCancel = () => {
    stopMapPinMove({ restore: true });
    onCancel?.();
  };

  const finishSave = async () => {
    if (isSaving) return;
    isSaving = true;

    const confirmBtn = bar.querySelector('[data-action="confirm"]');
    const cancelBtn = bar.querySelector('[data-action="cancel"]');
    if (confirmBtn) confirmBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;

    const center = readMapCenter(map);
    const patch = {
      latitude: center.lat,
      longitude: center.lng,
    };

    try {
      await updateItem(categoryId, item.id, patch);
      syncCachedItemWrite(categoryId, item.id, { patch });
      stopMapPinMove({ restore: true });
      onSaved?.({ categoryId, itemId: item.id, ...patch });
    } catch (err) {
      devError('move pin:', err);
      isSaving = false;
      if (confirmBtn) confirmBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
    }
  };

  bar.querySelector('[data-action="cancel"]')?.addEventListener('click', finishCancel);
  bar.querySelector('[data-action="confirm"]')?.addEventListener('click', () => {
    void finishSave();
  });

  const onMapMove = () => {
    pinEl.classList.add('is-moving');
  };

  const onMapMoveEnd = () => {
    pinEl.classList.remove('is-moving');
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      finishCancel();
    }
  };

  map.on('move', onMapMove);
  map.on('moveend', onMapMoveEnd);
  document.addEventListener('keydown', onKeyDown, { signal: abort.signal });

  // Centrer la carte sous le pin fixe (le tip du pin = centre écran).
  map.easeTo({
    center: [lng, lat],
    zoom: Math.max(map.getZoom(), 15),
    duration: 500,
    essential: true,
  });

  document.body.classList.add('map-pin-move-active');

  activeSession = {
    map,
    pinEl,
    bar,
    onMapMove,
    abort,
    categoryId,
    itemId: item.id,
  };

  // Cleanup moveend via abort when stopping — attach with once pattern in stop
  const moveEndCleanup = () => map.off('moveend', onMapMoveEnd);
  abort.signal.addEventListener('abort', moveEndCleanup, { once: true });

  return true;
}
