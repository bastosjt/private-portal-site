import { findCachedItemById } from '../data/appDataCache.js';
import { getActiveTravelId } from '../lib/space-settings.js';

/** Biais doux par défaut (Paris) — ne filtre pas hors zone, aide les recherches FR. */
const DEFAULT_PROXIMITY = '2.3522,48.8566';

function getTravelSearchContext(travel) {
  if (!travel) return null;

  const context = {
    proximity: null,
    near: null,
  };

  if (travel.longitude != null && travel.latitude != null) {
    context.proximity = `${travel.longitude},${travel.latitude}`;
  }

  if (travel.localisation?.trim()) {
    context.near = travel.localisation.trim();
  } else {
    const nearParts = [travel.destination, travel.pays].filter(Boolean);
    if (nearParts.length) context.near = nearParts.join(', ');
  }

  if (!context.proximity && !context.near) return null;
  return context;
}

function getAddressFieldContext(form, category, field) {
  const addressFieldName = field.placeSearch?.addressField
    || category.fields.find((item) => item.type === 'address')?.name;

  if (!addressFieldName) return null;

  const el = form.elements[addressFieldName];
  if (!el) return null;

  const lat = el.dataset.lat ? Number(el.dataset.lat) : null;
  const lng = el.dataset.lng ? Number(el.dataset.lng) : null;
  const value = el.value.trim();

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return {
      proximity: `${lng},${lat}`,
      near: value || null,
    };
  }

  if (value) {
    return { near: value, proximity: null };
  }

  return null;
}

function getFormTravelContext(form, category) {
  const travelField = category.fields.find((item) => item.optionsFrom === 'travels');
  if (!travelField) return null;

  const travelId = form.elements[travelField.name]?.value?.trim();
  if (!travelId) return null;

  return getTravelSearchContext(findCachedItemById('travels', travelId));
}

function withDefaultProximity(context) {
  if (context?.proximity || context?.near) return context;
  return { proximity: DEFAULT_PROXIMITY, near: null };
}

/**
 * Contexte de biais pour l'autocomplétion nom (POI).
 * Pas de restriction pays (includedRegionCodes) : elle excluait les monuments
 * hors zone (ex. Tour Eiffel avec voyage actif en Pologne).
 * Pas de géoloc utilisateur : même problème depuis l'étranger.
 */
export function resolvePlaceSearchContext(form, category, field) {
  const formTravel = getFormTravelContext(form, category);
  if (formTravel) return withDefaultProximity(formTravel);

  const addressContext = getAddressFieldContext(form, category, field);
  if (addressContext) return withDefaultProximity(addressContext);

  const activeTravel = getTravelSearchContext(
    findCachedItemById('travels', getActiveTravelId()),
  );
  if (activeTravel) return withDefaultProximity(activeTravel);

  return { proximity: DEFAULT_PROXIMITY, near: null };
}

/** Rayon max autorisé par l'API Google Places Autocomplete (50 km). */
const LOCATION_BIAS_RADIUS_M = 50000;

export function toGoogleLocationBias(context) {
  const proximity = context?.proximity;
  if (!proximity) return null;

  const [lng, lat] = proximity.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    circle: {
      center: { latitude: lat, longitude: lng },
      radius: LOCATION_BIAS_RADIUS_M,
    },
  };
}
