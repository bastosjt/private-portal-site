import { toGoogleLocationBias } from './place-search-context.js';
import { buildGoogleMapsUrl } from './google-maps-url.js';
import { GOOGLE_PLACES_API_KEY, isGooglePlacesConfigured } from './google-places-config.js';
import { parseGooglePriceRangeToEur } from './currency-to-eur.js';
import { trackApiRequest } from './api-usage-tracker.js';
import { devWarn } from './dev-log.js';

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places/';
const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const LEGACY_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

const LEGACY_PRICE_LEVELS = [
  'PRICE_LEVEL_FREE',
  'PRICE_LEVEL_INEXPENSIVE',
  'PRICE_LEVEL_MODERATE',
  'PRICE_LEVEL_EXPENSIVE',
  'PRICE_LEVEL_VERY_EXPENSIVE',
];

function normalizeSuggestion(item) {
  const pred = item.placePrediction;
  if (!pred) return null;

  const placeId = pred.placeId || pred.place?.replace(/^places\//, '') || '';
  if (!placeId) return null;

  const name = pred.structuredFormat?.mainText?.text || pred.text?.text || '';
  const address = pred.structuredFormat?.secondaryText?.text || '';

  return {
    id: placeId,
    placeId,
    name,
    address,
    lat: null,
    lng: null,
    mapsUrl: '',
  };
}

const PLACE_DETAILS_FIELD_MASK = 'id,displayName,formattedAddress,location,googleMapsUri,priceRange,priceLevel,primaryType,types,addressComponents';

const GEOGRAPHIC_PRIMARY_TYPE = '(regions)';

const GEOGRAPHIC_PLACE_TYPES = new Set([
  'country',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'administrative_area_level_3',
  'administrative_area_level_4',
  'administrative_area_level_5',
  'locality',
  'postal_town',
  'sublocality',
  'sublocality_level_1',
  'sublocality_level_2',
  'neighborhood',
  'colloquial_area',
  'archipelago',
  'continent',
]);

export function isGeographicPlace(place) {
  const types = [
    place?.primaryType,
    ...(Array.isArray(place?.types) ? place.types : []),
  ].filter(Boolean);

  return types.some((type) => GEOGRAPHIC_PLACE_TYPES.has(type));
}

function extractCountryFromAddressComponents(components) {
  if (!Array.isArray(components)) return null;

  const country = components.find((component) => component.types?.includes('country'));
  return country?.longText?.trim() || country?.shortText?.trim() || null;
}

const PRICE_LEVEL_EUR_RANGES = {
  PRICE_LEVEL_FREE: { prixMin: 0, prixMax: null },
  PRICE_LEVEL_INEXPENSIVE: { prixMin: 10, prixMax: 20 },
  PRICE_LEVEL_MODERATE: { prixMin: 20, prixMax: 40 },
  PRICE_LEVEL_EXPENSIVE: { prixMin: 40, prixMax: 70 },
  PRICE_LEVEL_VERY_EXPENSIVE: { prixMin: 70, prixMax: null },
};

function priceLevelToEurRange(priceLevel) {
  return PRICE_LEVEL_EUR_RANGES[priceLevel] ?? { prixMin: null, prixMax: null };
}

async function normalizePlaceDetails(data, suggestion = {}) {
  const name = data.displayName?.text || suggestion.name || '';
  const address = data.formattedAddress || suggestion.address || '';
  const lat = data.location?.latitude;
  const lng = data.location?.longitude;
  const mapsUrl = data.googleMapsUri?.trim()
    || buildGoogleMapsUrl({ name, address, lat, lng });

  let { prixMin, prixMax } = await parseGooglePriceRangeToEur(data.priceRange);
  if (prixMin == null && prixMax == null && data.priceLevel) {
    ({ prixMin, prixMax } = priceLevelToEurRange(data.priceLevel));
  }

  return {
    ...suggestion,
    placeId: data.id?.replace(/^places\//, '') || suggestion.placeId,
    name,
    address,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    mapsUrl,
    prixMin,
    prixMax,
    primaryType: data.primaryType || null,
    types: Array.isArray(data.types) ? data.types : [],
    country: extractCountryFromAddressComponents(data.addressComponents),
  };
}

export function createPlaceSearchSessionToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : ((rand & 0x3) | 0x8);
    return value.toString(16);
  });
}

function buildAutocompleteBody(input, sessionToken, language, { locationBias = null, searchMode = null } = {}) {
  const body = {
    input,
    sessionToken,
    languageCode: language,
  };

  if (locationBias) body.locationBias = locationBias;
  if (searchMode === 'geographic') body.includedPrimaryTypes = [GEOGRAPHIC_PRIMARY_TYPE];
  return body;
}

async function fetchAutocompleteSuggestions(body, signal) {
  const response = await fetch(AUTOCOMPLETE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let detail = '';
    try {
      const errorData = await response.json();
      detail = errorData?.error?.message || errorData?.error?.status || '';
    } catch {
      // ignore parse errors
    }
    const err = new Error(`Google autocomplete ${response.status}${detail ? `: ${detail}` : ''}`);
    err.status = response.status;
    throw err;
  }

  trackApiRequest('google-places');

  const data = await response.json();
  return (data.suggestions || [])
    .map(normalizeSuggestion)
    .filter(Boolean);
}

async function fetchSuggestionsWithFallback(input, sessionToken, language, locationBias, signal, searchMode) {
  const biasedBody = buildAutocompleteBody(input, sessionToken, language, { locationBias, searchMode });

  try {
    const suggestions = await fetchAutocompleteSuggestions(biasedBody, signal);
    if (suggestions.length || !locationBias) return suggestions;
  } catch (err) {
    if (err.name === 'AbortError' || !locationBias) throw err;
    devWarn('google places suggest (biased):', err.message);
  }

  return fetchAutocompleteSuggestions(
    buildAutocompleteBody(input, sessionToken, language, { searchMode }),
    signal,
  );
}

export async function suggestPlaces(query, {
  sessionToken,
  signal,
  language = 'fr',
  context,
  searchMode = null,
} = {}) {
  if (!isGooglePlacesConfigured()) return [];

  const trimmed = query.trim();
  if (trimmed.length < 2 || !sessionToken) return [];

  const searchContext = context || {};
  const locationBias = toGoogleLocationBias(searchContext);

  try {
    const suggestions = await fetchSuggestionsWithFallback(
      trimmed,
      sessionToken,
      language,
      locationBias,
      signal,
      searchMode,
    );
    return suggestions.slice(0, 6);
  } catch (err) {
    if (err.name !== 'AbortError') devWarn('google places suggest:', err.message);
    throw err;
  }
}

export async function retrievePlace(placeId, { sessionToken, signal, suggestion = {} } = {}) {
  if (!isGooglePlacesConfigured() || !placeId) return null;

  const id = placeId.replace(/^places\//, '');
  const url = new URL(`${PLACE_DETAILS_URL}${encodeURIComponent(id)}`);
  if (sessionToken) url.searchParams.set('sessionToken', sessionToken);

  const response = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK,
    },
    signal,
  });

  if (!response.ok) throw new Error(`Google place details ${response.status}`);

  trackApiRequest('google-places');

  const data = await response.json();
  return normalizePlaceDetails(data, suggestion);
}

function mapLegacyPlaceResult(result, suggestion = {}) {
  const lat = result.geometry?.location?.lat;
  const lng = result.geometry?.location?.lng;
  const name = result.name || suggestion.name || '';
  const address = result.formatted_address || suggestion.address || '';
  let { prixMin, prixMax } = { prixMin: null, prixMax: null };

  if (Number.isInteger(result.price_level) && result.price_level >= 0 && result.price_level < LEGACY_PRICE_LEVELS.length) {
    ({ prixMin, prixMax } = priceLevelToEurRange(LEGACY_PRICE_LEVELS[result.price_level]));
  }

  return {
    ...suggestion,
    placeId: result.place_id || suggestion.placeId || null,
    name,
    address,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    mapsUrl: result.url?.trim()
      || buildGoogleMapsUrl({ name, address, lat, lng }),
    prixMin,
    prixMax,
    primaryType: result.types?.[0] || null,
    types: Array.isArray(result.types) ? result.types : [],
  };
}

function fetchLegacyPlaceDetailsJsonp(cid, { signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const callbackName = `__googlePlacesCid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const params = new URLSearchParams({
      cid,
      key: GOOGLE_PLACES_API_KEY,
      language: 'fr',
      fields: 'place_id,name,formatted_address,geometry,url,price_level,types',
      callback: callbackName,
    });

    const script = document.createElement('script');
    let settled = false;
    let timeoutId = null;

    const cleanup = () => {
      try {
        delete window[callbackName];
      } catch {
        // ignore
      }
      script.remove();
      if (timeoutId) clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
    };

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(value);
    };

    const onAbort = () => finish(reject, new DOMException('Aborted', 'AbortError'));

    window[callbackName] = (data) => finish(resolve, data);

    script.onerror = () => finish(reject, new Error('Google place details (cid) JSONP failed'));
    script.src = `${LEGACY_DETAILS_URL}?${params.toString()}`;

    timeoutId = setTimeout(() => {
      finish(reject, new Error('Google place details (cid) timed out'));
    }, 15000);

    signal?.addEventListener('abort', onAbort, { once: true });
    document.head.appendChild(script);
  });
}

export async function retrievePlaceByCid(cid, { signal, suggestion = {} } = {}) {
  if (!isGooglePlacesConfigured() || !cid) return null;

  let data;
  try {
    data = await fetchLegacyPlaceDetailsJsonp(cid, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    devWarn('google places cid jsonp:', err.message);
    return null;
  }

  if (data.status !== 'OK' || !data.result) {
    devWarn('google places cid:', data.status, data.error_message || '');
    return null;
  }

  trackApiRequest('google-places');

  const legacyPlace = mapLegacyPlaceResult(data.result, suggestion);

  if (legacyPlace.placeId) {
    try {
      const enriched = await retrievePlace(legacyPlace.placeId, {
        signal,
        suggestion: legacyPlace,
      });
      if (enriched) return enriched;
    } catch (err) {
      if (err.name !== 'AbortError') devWarn('google places cid enrich:', err.message);
    }
  }

  return legacyPlace;
}

const TEXT_SEARCH_FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.priceRange,places.priceLevel,places.primaryType,places.types';

export async function searchPlaceByText(textQuery, {
  signal,
  language = 'fr',
  lat = null,
  lng = null,
  radius = 150,
  searchMode = null,
} = {}) {
  if (!isGooglePlacesConfigured()) return null;

  const trimmed = textQuery?.trim();
  if (!trimmed) return null;

  const body = {
    textQuery: trimmed,
    languageCode: language,
    maxResultCount: 1,
  };

  if (searchMode === 'geographic') {
    body.includedType = GEOGRAPHIC_PRIMARY_TYPE;
  }

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
      'X-Goog-FieldMask': TEXT_SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) throw new Error(`Google text search ${response.status}`);

  trackApiRequest('google-places');

  const data = await response.json();
  const place = data.places?.[0];
  if (!place) return null;

  const normalized = await normalizePlaceDetails(place, {
    name: place.displayName?.text || trimmed,
    address: place.formattedAddress || '',
  });

  if (searchMode === 'geographic' && !isGeographicPlace(normalized)) {
    return null;
  }

  return normalized;
}
