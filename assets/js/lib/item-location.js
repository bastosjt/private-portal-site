import { sanitizeHttpsUrl } from './safe-url.js';
import { buildGoogleMapsUrl } from './google-maps-url.js';

export function getItemLocationLabel(categoryId, item) {
  if (!item) return '';

  if (categoryId === 'activities') return item.localisation?.trim() || '';
  if (categoryId === 'restaurants') return item.adresse?.trim() || '';
  if (categoryId === 'travels') return item.localisation?.trim() || '';
  return '';
}

function buildItemMapsUrl(item, categoryId) {
  const name = categoryId === 'restaurants' || categoryId === 'activities'
    ? item.nom?.trim() || ''
    : categoryId === 'travels'
      ? item.localisation?.trim() || ''
      : '';
  const address = getItemLocationLabel(categoryId, item);

  return buildGoogleMapsUrl({
    name,
    address,
    lat: item.latitude,
    lng: item.longitude,
    label: address,
  }) || null;
}

export function getMapsUrl(item, categoryId) {
  if (categoryId === 'restaurants' || categoryId === 'activities' || categoryId === 'travels') {
    const safeLienMaps = sanitizeHttpsUrl(item.lienMaps);
    if (safeLienMaps) return safeLienMaps;
  }

  return buildItemMapsUrl(item, categoryId);
}
