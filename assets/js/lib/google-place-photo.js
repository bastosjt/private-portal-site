import { parseGoogleMapsUrl } from './google-maps-url-parse.js';
import { sanitizeHttpsUrl } from './safe-url.js';
import { GOOGLE_PLACES_API_KEY, isGooglePlacesConfigured } from './google-places-config.js';
import { getItemLocationLabel } from './item-location.js';
import {
  buildPlacePhotoCacheKey,
  getCachedPlacePhotoMedia,
  runPlacePhotoLoad,
  setCachedPlacePhotoMedia,
} from './place-photo-cache.js';
import { getItemPlacePhotoName, persistPlacePhotoName } from './place-photo-store.js';
import { trackApiRequest } from './api-usage-tracker.js';
import { devWarn } from './dev-log.js';

const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places/';
const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const PLACE_PHOTOS_FIELD_MASK = 'photos';
const TEXT_SEARCH_PHOTOS_FIELD_MASK = 'places.id,places.photos';

const PLACE_COLLECTIONS = new Set(['activities', 'restaurants', 'travels']);

export function buildPlacePhotoMediaUrl(photoName, { maxWidth = 960, maxHeight = 960 } = {}) {
  if (!photoName || !GOOGLE_PLACES_API_KEY) return null;

  const url = new URL(`https://places.googleapis.com/v1/${photoName}/media`);
  url.searchParams.set('maxWidthPx', String(maxWidth));
  url.searchParams.set('maxHeightPx', String(maxHeight));
  url.searchParams.set('key', GOOGLE_PLACES_API_KEY);
  return url.toString();
}

function pickPlaceCoverPhoto(photos = []) {
  return photos.find((photo) => photo?.name)?.name || null;
}

function pickFirstPlacePhoto(places = []) {
  for (const place of places) {
    const photoName = pickPlaceCoverPhoto(place?.photos);
    if (photoName) return photoName;
  }
  return null;
}

export function revokePlaceDetailMediaUrl(url) {
  if (!url?.startsWith('blob:')) return;
  URL.revokeObjectURL(url);
}

async function fetchPhotoNameFromPlaceId(placeId, { signal } = {}) {
  if (!isGooglePlacesConfigured() || !placeId) return null;

  const id = placeId.replace(/^places\//, '');
  const url = new URL(`${PLACE_DETAILS_URL}${encodeURIComponent(id)}`);

  const response = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': PLACE_PHOTOS_FIELD_MASK,
    },
    signal,
  });

  if (!response.ok) {
    devWarn('google place photos:', response.status);
    return null;
  }

  trackApiRequest('google-places');

  const data = await response.json();
  return pickPlaceCoverPhoto(data.photos);
}

async function searchPlacePhotoName(query, {
  signal,
  lat = null,
  lng = null,
  radius = 150,
  maxResultCount = 1,
} = {}) {
  if (!isGooglePlacesConfigured() || !query?.trim()) return null;

  const body = {
    textQuery: query.trim(),
    languageCode: 'fr',
    maxResultCount: Math.min(Math.max(maxResultCount, 1), 5),
  };

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    body.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius,
      },
    };
  }

  const response = await fetch(TEXT_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': TEXT_SEARCH_PHOTOS_FIELD_MASK,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    devWarn('google place photo search:', response.status);
    return null;
  }

  trackApiRequest('google-places');

  const data = await response.json();
  return pickFirstPlacePhoto(data.places);
}

function buildPlaceSearchQuery(item, categoryId) {
  if (categoryId === 'travels') {
    const localisation = item?.localisation?.trim() || '';
    const pays = item?.pays?.trim() || '';
    if (!localisation) return pays;
    if (!pays || localisation.toLowerCase().includes(pays.toLowerCase())) return localisation;
    return `${localisation}, ${pays}`;
  }

  return [item?.nom?.trim(), getItemLocationLabel(categoryId, item)].filter(Boolean).join(' ').trim();
}

function getItemCoords(item, parsedMapsUrl = null) {
  const lat = Number(item?.latitude);
  const lng = Number(item?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  if (Number.isFinite(parsedMapsUrl?.lat) && Number.isFinite(parsedMapsUrl?.lng)) {
    return { lat: parsedMapsUrl.lat, lng: parsedMapsUrl.lng };
  }

  return { lat: null, lng: null };
}

async function resolvePlacePhotoName(item, categoryId, { signal } = {}) {
  const lienMaps = sanitizeHttpsUrl(item?.lienMaps);
  const parsedMapsUrl = lienMaps ? parseGoogleMapsUrl(lienMaps) : null;
  const { lat, lng } = getItemCoords(item, parsedMapsUrl);

  if (parsedMapsUrl?.placeId) {
    const photoName = await fetchPhotoNameFromPlaceId(parsedMapsUrl.placeId, { signal });
    if (photoName) return photoName;
  }

  const query = buildPlaceSearchQuery(item, categoryId);
  if (!query) return null;

  return searchPlacePhotoName(query, {
    signal,
    lat,
    lng,
    maxResultCount: 1,
  });
}

export function canLoadPlaceDetailMedia(item, categoryId) {
  if (!item || !PLACE_COLLECTIONS.has(categoryId)) return false;

  if (sanitizeHttpsUrl(item.lienMaps)) return true;
  if (getItemLocationLabel(categoryId, item)) return true;

  const lat = Number(item.latitude);
  const lng = Number(item.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function buildPlacePhotoMedia(photoName) {
  const url = buildPlacePhotoMediaUrl(photoName);
  if (!url) return null;
  return { type: 'photo', url, photoName };
}

export function getPlacePhotoMediaFromItem(item) {
  const photoName = getItemPlacePhotoName(item);
  if (!photoName) return null;
  return buildPlacePhotoMedia(photoName);
}

export async function fetchPlaceDetailMedia(item, categoryId, { signal, ignoreStoredPhotoName = false } = {}) {
  if (!isGooglePlacesConfigured() || !canLoadPlaceDetailMedia(item, categoryId)) return null;

  const cacheKey = buildPlacePhotoCacheKey(item, categoryId);
  const storedMedia = ignoreStoredPhotoName ? null : getPlacePhotoMediaFromItem(item);
  if (storedMedia) {
    setCachedPlacePhotoMedia(cacheKey, storedMedia);
    return storedMedia;
  }

  const cached = getCachedPlacePhotoMedia(cacheKey);
  if (cached) return cached;

  try {
    return await runPlacePhotoLoad(cacheKey, async () => {
      const stillCached = getCachedPlacePhotoMedia(cacheKey);
      if (stillCached) return stillCached;

      const photoName = await resolvePlacePhotoName(item, categoryId, { signal });
      if (!photoName) return null;

      const media = buildPlacePhotoMedia(photoName);
      if (!media) return null;

      setCachedPlacePhotoMedia(cacheKey, media);
      void persistPlacePhotoName(categoryId, item.id, photoName);
      return media;
    });
  } catch (err) {
    if (err.name !== 'AbortError') devWarn('google place media:', err.message);
    throw err;
  }
}

export function canLoadActivityPlacePhoto(item) {
  return canLoadPlaceDetailMedia(item, 'activities');
}

export function canLoadRestaurantPlacePhoto(item) {
  return canLoadPlaceDetailMedia(item, 'restaurants');
}

export async function fetchActivityDetailMedia(item, options = {}) {
  return fetchPlaceDetailMedia(item, 'activities', options);
}

export async function fetchRestaurantDetailMedia(item, options = {}) {
  return fetchPlaceDetailMedia(item, 'restaurants', options);
}

export function canLoadTravelPlacePhoto(item) {
  return canLoadPlaceDetailMedia(item, 'travels');
}

export async function fetchTravelDetailMedia(item, options = {}) {
  return fetchPlaceDetailMedia(item, 'travels', options);
}

/** @deprecated Utiliser fetchActivityDetailMedia */
export async function fetchActivityPlacePhotoUrl(item, options = {}) {
  const media = await fetchActivityDetailMedia(item, options);
  return media?.type === 'photo' ? media.url : null;
}
