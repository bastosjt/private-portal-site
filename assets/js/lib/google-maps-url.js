/**
 * Construit un lien Google Maps orienté POI (nom + coords précises).
 * Format /place/ privilégié quand nom et coordonnées sont disponibles.
 */
export function buildPlaceIdMapsUrl(placeId) {
  const id = placeId?.replace(/^places\//, '').trim();
  if (!id) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`place_id:${id}`)}`;
}

export function buildGoogleMapsUrl({ name, address, lat, lng, label } = {}) {
  const placeName = name?.trim() || '';
  const placeAddress = address?.trim() || '';
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const textQuery = [placeName, placeAddress].filter(Boolean).join(', ')
    || label?.trim()
    || '';

  if (textQuery) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(textQuery)}`;
  }

  if (placeName && hasCoords) {
    return `https://www.google.com/maps/place/${encodeURIComponent(placeName)}/@${lat},${lng},17z`;
  }

  if (hasCoords) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  return '';
}
