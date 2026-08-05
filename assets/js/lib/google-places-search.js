import { toGoogleLocationBias } from './place-search-context.js';
import { buildGoogleMapsUrl } from './google-maps-url.js';
import { GOOGLE_PLACES_API_KEY, isGooglePlacesConfigured } from './google-places-config.js';
import { parseGooglePriceRangeToEur } from './currency-to-eur.js';
import { devWarn } from './dev-log.js';

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places/';

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

const PLACE_DETAILS_FIELD_MASK = 'id,displayName,formattedAddress,location,googleMapsUri,priceRange,priceLevel,primaryType,types';

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

function buildAutocompleteBody(input, sessionToken, language, { locationBias = null } = {}) {
  const body = {
    input,
    sessionToken,
    languageCode: language,
  };

  if (locationBias) body.locationBias = locationBias;
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

  const data = await response.json();
  return (data.suggestions || [])
    .map(normalizeSuggestion)
    .filter(Boolean);
}

async function fetchSuggestionsWithFallback(input, sessionToken, language, locationBias, signal) {
  const biasedBody = buildAutocompleteBody(input, sessionToken, language, { locationBias });

  try {
    const suggestions = await fetchAutocompleteSuggestions(biasedBody, signal);
    if (suggestions.length || !locationBias) return suggestions;
  } catch (err) {
    if (err.name === 'AbortError' || !locationBias) throw err;
    devWarn('google places suggest (biased):', err.message);
  }

  return fetchAutocompleteSuggestions(
    buildAutocompleteBody(input, sessionToken, language),
    signal,
  );
}

export async function suggestPlaces(query, {
  sessionToken,
  signal,
  language = 'fr',
  context,
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

  const data = await response.json();
  return normalizePlaceDetails(data, suggestion);
}
