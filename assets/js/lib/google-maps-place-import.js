import { isGoogleMapsUrl, isShortGoogleMapsUrl, parseGoogleMapsUrl } from './google-maps-url-parse.js';
import { retrievePlace, retrievePlaceByCid, searchPlaceByText } from './google-places-search.js';
import { isGooglePlacesConfigured } from './google-places-config.js';
import { formatListItemPrice } from './price-format.js';
import { getPlaceAddressFieldName, getPlaceNameField } from './place-form-fields.js';
import { sanitizeHttpsUrl } from './safe-url.js';
import { isExabaseConfigured, EXABASE_API_KEY } from './exabase-config.js';
import { devWarn } from './dev-log.js';

const EXABASE_ENDPOINT = 'https://api.exabase.io/v2/link';

export class MapsUrlImportError extends Error {
  constructor(message, { code = 'unknown' } = {}) {
    super(message);
    this.name = 'MapsUrlImportError';
    this.code = code;
  }
}

function buildPreviewPrice(place) {
  const label = formatListItemPrice({
    prixMin: place.prixMin,
    prixMax: place.prixMax,
  });
  return label || '';
}

function parseMapsPageTitle(title) {
  const cleaned = String(title || '')
    .replace(/\s*[-–—|]\s*Google Maps\s*$/i, '')
    .trim();
  const parts = cleaned.split('·').map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return {
      name: parts[0],
      address: parts.slice(1).join(' · '),
    };
  }

  return { name: cleaned, address: '' };
}

async function fetchMapsLinkPreviewMeta(mapsUrl, { signal } = {}) {
  if (!isExabaseConfigured()) return null;

  const safeUrl = sanitizeHttpsUrl(mapsUrl);
  if (!safeUrl) return null;

  const params = new URLSearchParams({ url: safeUrl });
  const apiKey = EXABASE_API_KEY.trim();

  try {
    const response = await fetch(`${EXABASE_ENDPOINT}?${params}`, {
      signal,
      headers: { 'X-Api-Key': apiKey },
    });
    if (!response.ok) return null;

    const payload = await response.json();
    const resolvedUrl = sanitizeHttpsUrl(payload?.url || safeUrl);

    return {
      title: payload?.title?.trim() || '',
      resolvedUrl: resolvedUrl && isGoogleMapsUrl(resolvedUrl) ? resolvedUrl : resolvedUrl,
    };
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    devWarn('maps-url-import exabase:', err.message);
    return null;
  }
}

async function expandGoogleMapsUrl(mapsUrl, { signal } = {}) {
  const meta = await fetchMapsLinkPreviewMeta(mapsUrl, { signal });
  if (!meta) {
    return { url: mapsUrl, title: '' };
  }

  return {
    url: meta.resolvedUrl || mapsUrl,
    title: meta.title || '',
  };
}

async function resolvePlaceFromMapsPage(mapsUrl, { signal, title = '', searchMode = null } = {}) {
  const pageTitle = title || (await fetchMapsLinkPreviewMeta(mapsUrl, { signal }))?.title || '';
  if (!pageTitle) return null;

  const { name, address } = parseMapsPageTitle(pageTitle);
  const textQuery = [name, address].filter(Boolean).join(' ');
  if (!textQuery) return null;

  return searchPlaceByText(textQuery, { signal, searchMode });
}

function resolvePlaceFromFormFields(form, category, { signal } = {}) {
  if (!form || !category) return Promise.resolve(null);

  const placeNameField = getPlaceNameField(category);
  const addressFieldName = getPlaceAddressFieldName(category);
  const addressEl = addressFieldName ? form.elements[addressFieldName] : null;
  const name = form.elements[placeNameField?.name]?.value?.trim()
    || addressEl?.value?.trim()
    || '';
  if (!name) return Promise.resolve(null);

  const address = addressEl?.value?.trim() || '';
  const lat = addressEl?.dataset.lat ? Number(addressEl.dataset.lat) : null;
  const lng = addressEl?.dataset.lng ? Number(addressEl.dataset.lng) : null;
  const searchMode = placeNameField?.placeSearch?.mode || null;

  return searchPlaceByText([name, address].filter(Boolean).join(' '), {
    signal,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    searchMode,
  });
}

async function resolvePlaceFromParsedUrl(parsed, { signal, searchMode = null } = {}) {
  if (parsed.cid) {
    const byCid = await retrievePlaceByCid(parsed.cid, { signal });
    if (byCid) return byCid;
  }

  if (parsed.placeId) {
    const byId = await retrievePlace(parsed.placeId, { signal });
    if (byId) return byId;
  }

  const textQuery = parsed.name || parsed.query;
  if (textQuery) {
    const byText = await searchPlaceByText(textQuery, {
      signal,
      lat: parsed.lat,
      lng: parsed.lng,
      searchMode,
    });
    if (byText) return byText;
  }

  if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
    return searchPlaceByText(`${parsed.lat},${parsed.lng}`, {
      signal,
      lat: parsed.lat,
      lng: parsed.lng,
      radius: 80,
      searchMode,
    });
  }

  return null;
}

export async function fetchPlaceFromMapsUrl(rawUrl, { signal, form, category } = {}) {
  if (!isGooglePlacesConfigured()) {
    throw new MapsUrlImportError('Import Google Maps indisponible.', { code: 'service' });
  }

  const originalUrl = sanitizeHttpsUrl(rawUrl?.trim());
  if (!originalUrl || !isGoogleMapsUrl(originalUrl)) {
    throw new MapsUrlImportError('Collez un lien Google Maps valide.', { code: 'invalid' });
  }

  let lookupUrl = originalUrl;
  let linkPreviewTitle = '';

  if (isShortGoogleMapsUrl(originalUrl)) {
    const expanded = await expandGoogleMapsUrl(originalUrl, { signal });
    lookupUrl = expanded.url || originalUrl;
    linkPreviewTitle = expanded.title || '';
  }

  const parsed = parseGoogleMapsUrl(lookupUrl);
  if (!parsed) {
    throw new MapsUrlImportError('Impossible de lire ce lien Google Maps.', { code: 'invalid' });
  }

  const searchMode = getPlaceNameField(category)?.placeSearch?.mode || null;

  let place = await resolvePlaceFromParsedUrl(parsed, { signal, searchMode });

  if (!place && linkPreviewTitle) {
    const { name, address } = parseMapsPageTitle(linkPreviewTitle);
    place = await searchPlaceByText([name, address].filter(Boolean).join(' '), { signal, searchMode });
  }

  if (!place) {
    place = await resolvePlaceFromMapsPage(originalUrl, { signal, title: linkPreviewTitle, searchMode });
  }

  if (!place) {
    place = await resolvePlaceFromFormFields(form, category, { signal });
  }

  if (!place) {
    throw new MapsUrlImportError('Lieu introuvable pour ce lien.', { code: 'not_found' });
  }

  const canonicalUrl = sanitizeHttpsUrl(place.mapsUrl || lookupUrl || originalUrl);

  return {
    url: originalUrl,
    title: place.name?.trim() || parsed.name || parsed.query || 'Lieu détecté',
    address: place.address?.trim() || '',
    price: buildPreviewPrice(place),
    place: {
      ...place,
      mapsUrl: canonicalUrl || originalUrl,
    },
  };
}
