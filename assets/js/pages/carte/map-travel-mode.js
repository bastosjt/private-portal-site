import { getCachedItems, findCachedItemById } from '../../data/appDataCache.js';
import { getActiveTravelId, setActiveTravelId } from '../../lib/space-settings.js';
import {
  fitMapToVisibleMarkers,
  isTravelModeActive,
  setTravelModeState,
} from './map-markers.js';
import { focusMapOnUserLocation } from './interactive-map.js';
import { initMapTravelModePicker } from './map-travel-mode-picker.js';

function getTravelLabel(travel) {
  return travel?.destination?.trim() || 'Voyage';
}

function listTravels() {
  return getCachedItems('travels') ?? [];
}

function resolvePreferredTravel(travels) {
  if (!travels.length) return null;

  const savedId = getActiveTravelId();
  const saved = savedId ? travels.find((travel) => travel.id === savedId) : null;
  if (saved) return saved;

  const upcoming = travels.find((travel) => !travel.done);
  if (upcoming) return upcoming;

  if (travels.length === 1) return travels[0];
  return null;
}

export function initMapTravelModeControls({
  getMap,
  getAddItemModal,
  onModeChanged,
  showFeedback,
  syncUi,
  signal,
} = {}) {
  const picker = initMapTravelModePicker({ signal });

  async function activateTravel(travelId, { persist = true, fit = true } = {}) {
    const map = getMap?.();
    const travel = findCachedItemById('travels', travelId);
    if (!travel) return false;

    if (persist) {
      await setActiveTravelId(travelId);
    }

    setTravelModeState(map, { active: true, travelId });
    syncUi?.();

    if (fit && map) {
      const fitted = fitMapToVisibleMarkers(map);
      if (!fitted && travel.longitude != null && travel.latitude != null) {
        map.easeTo({
          center: [travel.longitude, travel.latitude],
          zoom: Math.max(map.getZoom(), 11),
          duration: 700,
          essential: true,
        });
      }
    }

    showFeedback?.(`Mode voyage - ${getTravelLabel(travel)}`);
    onModeChanged?.();
    return true;
  }

  function deactivateTravelMode({ feedback = true, focusLocal = true } = {}) {
    const map = getMap?.();
    setTravelModeState(map, { active: false, travelId: '' });
    syncUi?.();

    if (focusLocal && map) {
      focusMapOnUserLocation(map);
    }

    if (feedback) showFeedback?.('Mode voyage désactivé');
    onModeChanged?.();
  }

  function openCreateTravel() {
    getAddItemModal?.()?.open?.('travels');
  }

  async function openPickerFlow({ forcePicker = false } = {}) {
    const travels = listTravels();

    if (!travels.length) {
      const result = await picker.open({ travels: [] });
      if (result?.action === 'create') openCreateTravel();
      return result?.action || 'dismiss';
    }

    const preferred = resolvePreferredTravel(travels);
    const canAutoSelect = !forcePicker
      && preferred
      && !preferred.done
      && (travels.length === 1 || preferred.id === getActiveTravelId());

    if (canAutoSelect) {
      await activateTravel(preferred.id);
      return 'activated';
    }

    const highlightDoneTravel = preferred?.done ? preferred : null;
    const result = await picker.open({
      travels,
      selectedId: preferred?.id || getActiveTravelId() || '',
      highlightDoneTravel,
    });

    if (result?.action === 'select' && result.travelId) {
      await activateTravel(result.travelId);
      return 'activated';
    }

    if (result?.action === 'create') {
      openCreateTravel();
      return 'create';
    }

    return result?.action || 'dismiss';
  }

  async function toggleTravelMode({ forcePicker = false } = {}) {
    if (isTravelModeActive() && !forcePicker) {
      deactivateTravelMode();
      return 'deactivated';
    }

    return openPickerFlow({ forcePicker: forcePicker || isTravelModeActive() });
  }

  return {
    toggleTravelMode,
    activateTravel,
    deactivateTravelMode,
    openPickerFlow,
  };
}
