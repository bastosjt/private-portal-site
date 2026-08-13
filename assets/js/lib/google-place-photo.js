import { parseGoogleMapsUrl } from './google-maps-url-parse.js';
import { sanitizeHttpsUrl } from './safe-url.js';
import { GOOGLE_PLACES_API_KEY, isGooglePlacesConfigured } from './google-places-config.js';
import { retrievePlaceByCid, searchPlaceByText } from './google-places-search.js';
import { getItemLocationLabel } from './item-location.js';
import { devWarn } from './dev-log.js';

const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places/';
const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const PLACE_PHOTOS_FIELD_MASK = 'photos';
const TEXT_SEARCH_PHOTOS_FIELD_MASK = 'places.id,places.photos';

const PLACE_COLLECTIONS = new Set(['activities', 'restaurants', 'travels']);

function buildPlacePhotoMediaUrl(photoName, { maxWidth = 960, maxHeight = 960 } = {}) {
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

async function loadPlacePhotoObjectUrl(photoName, { signal } = {}) {
  const mediaUrl = buildPlacePhotoMediaUrl(photoName);
  if (!mediaUrl) return null;

  const response = await fetch(mediaUrl, {
    signal,
    referrerPolicy: 'no-referrer',
  });

  if (!response.ok) {
    devWarn('google place photo media:', response.status);
    return null;
  }

  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) return null;

  return URL.createObjectURL(blob);
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

function buildTravelPhotoQueries(item) {
  const queries = [];
  const primary = buildPlaceSearchQuery(item, 'travels');
  if (primary) queries.push(primary);

  const localisation = item?.localisation?.trim();
  const pays = item?.pays?.trim();
  if (localisation && pays) {
    const combined = `${localisation}, ${pays}`;
    if (!queries.includes(combined)) queries.push(combined);
  }

  if (localisation && !queries.includes(localisation)) {
    queries.push(localisation);
  }

  return queries;
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

async function resolvePlaceItemId(item, categoryId, { signal, parsedMapsUrl = null } = {}) {
  if (parsedMapsUrl?.placeId) return parsedMapsUrl.placeId;

  const lienMaps = sanitizeHttpsUrl(item?.lienMaps);
  const parsed = parsedMapsUrl || (lienMaps ? parseGoogleMapsUrl(lienMaps) : null);

  if (parsed?.placeId) return parsed.placeId;

  if (parsed?.cid) {
    const place = await retrievePlaceByCid(parsed.cid, { signal });
    if (place?.placeId) return place.placeId;
  }

  const query = buildPlaceSearchQuery(item, categoryId);
  if (!query) return null;

  const { lat, lng } = getItemCoords(item, parsed);
  const place = await searchPlaceByText(query, {
    signal,
    lat,
    lng,
    radius: 120,
  });

  return place?.placeId || null;
}

async function searchTravelPlacePhotoName(item, { signal, lat, lng } = {}) {
  const queries = buildTravelPhotoQueries(item);

  for (const query of queries) {
    const photoName = await searchPlacePhotoName(query, {
      signal,
      lat,
      lng,
      maxResultCount: 5,
    });
    if (photoName) return photoName;
  }

  return null;
}

async function resolvePlacePhotoName(item, categoryId, { signal } = {}) {
  const lienMaps = sanitizeHttpsUrl(item?.lienMaps);
  const parsedMapsUrl = lienMaps ? parseGoogleMapsUrl(lienMaps) : null;
  const query = buildPlaceSearchQuery(item, categoryId);
  const { lat, lng } = getItemCoords(item, parsedMapsUrl);

  const placeId = await resolvePlaceItemId(item, categoryId, { signal, parsedMapsUrl });
  if (placeId) {
    const photoName = await fetchPhotoNameFromPlaceId(placeId, { signal });
    if (photoName) return photoName;
  }

  if (categoryId === 'travels') {
    return searchTravelPlacePhotoName(item, { signal, lat, lng });
  }

  if (query) {
    return searchPlacePhotoName(query, { signal, lat, lng });
  }

  return null;
}

export function canLoadPlaceDetailMedia(item, categoryId) {
  if (!item || !PLACE_COLLECTIONS.has(categoryId)) return false;

  if (sanitizeHttpsUrl(item.lienMaps)) return true;
  if (getItemLocationLabel(categoryId, item)) return true;

  const lat = Number(item.latitude);
  const lng = Number(item.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export async function fetchPlaceDetailMedia(item, categoryId, { signal } = {}) {
  if (!isGooglePlacesConfigured() || !canLoadPlaceDetailMedia(item, categoryId)) return null;

  try {
    const photoName = await resolvePlacePhotoName(item, categoryId, { signal });
    if (!photoName) return null;

    const blobUrl = await loadPlacePhotoObjectUrl(photoName, { signal });
    if (!blobUrl) return null;

    return { type: 'photo', url: blobUrl };
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
