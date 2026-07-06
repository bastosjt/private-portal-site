const BAN_URL = 'https://api-adresse.data.gouv.fr/search/';
const PHOTON_URL = 'https://photon.komoot.io/api/';

function buildMapsUrl({ label, lat, lng }) {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
}

function normalizeBanFeature(feature) {
  const props = feature.properties || {};
  const [lng, lat] = feature.geometry?.coordinates || [];
  const label = props.label || props.name || '';

  return {
    id: `ban-${props.id || label}`,
    label,
    line: props.name || label,
    city: props.city || '',
    postcode: props.postcode || '',
    country: 'France',
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    source: 'ban',
  };
}

function normalizePhotonFeature(feature) {
  const props = feature.properties || {};
  const [lng, lat] = feature.geometry?.coordinates || [];
  const parts = [
    props.housenumber,
    props.street || props.name,
    props.postcode,
    props.city || props.locality,
    props.country,
  ].filter(Boolean);

  const label = parts.join(', ') || props.name || '';
  const city = props.city || props.locality || props.state || '';

  return {
    id: `photon-${feature.properties?.osm_id || label}-${lat}-${lng}`,
    label,
    line: [props.housenumber, props.street || props.name].filter(Boolean).join(' ') || props.name || label,
    city,
    postcode: props.postcode || '',
    country: props.country || '',
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    source: 'photon',
  };
}

function withMapsUrl(suggestion) {
  return {
    ...suggestion,
    mapsUrl: buildMapsUrl(suggestion),
  };
}

function dedupeSuggestions(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchBan(query, limit, signal) {
  const url = new URL(BAN_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`BAN ${response.status}`);

  const data = await response.json();
  return (data.features || []).map(normalizeBanFeature).map(withMapsUrl);
}

async function searchPhoton(query, limit, signal) {
  const url = new URL(PHOTON_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('lang', 'fr');

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Photon ${response.status}`);

  const data = await response.json();
  return (data.features || []).map(normalizePhotonFeature).map(withMapsUrl);
}

export async function searchAddresses(query, { limit = 6, signal } = {}) {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const banLimit = Math.ceil(limit * 0.7);
  const photonLimit = limit;

  const results = await Promise.allSettled([
    searchBan(trimmed, banLimit, signal),
    searchPhoton(trimmed, photonLimit, signal),
  ]);

  const merged = [];
  for (const result of results) {
    if (result.status === 'fulfilled') merged.push(...result.value);
  }

  return dedupeSuggestions(merged).slice(0, limit);
}
