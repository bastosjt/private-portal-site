import { sanitizeHttpsUrl } from './safe-url.js';

export function getItemLocationLabel(categoryId, item) {
  if (!item) return '';

  if (categoryId === 'activities') return item.localisation?.trim() || '';
  if (categoryId === 'restaurants') return item.adresse?.trim() || '';
  if (categoryId === 'travels') return item.localisation?.trim() || item.destination?.trim() || '';
  return '';
}

export function getMapsUrl(item, categoryId) {
  if (categoryId === 'restaurants') {
    const safeLienMaps = sanitizeHttpsUrl(item.lienMaps);
    if (safeLienMaps) return safeLienMaps;
    if (item.latitude != null && item.longitude != null) {
      return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
    }
    if (item.adresse) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.adresse)}`;
    }
    return null;
  }

  if (item.latitude != null && item.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
  }

  const locationText = getItemLocationLabel(categoryId, item);
  if (locationText) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`;
  }

  return null;
}
