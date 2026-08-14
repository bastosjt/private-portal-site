const mediaCache = new Map();
const inflight = new Map();

export function buildPlacePhotoCacheKey(item, categoryId) {
  const photoName = item?.placePhotoName?.trim();
  if (photoName) return photoName;

  const lienMaps = item?.lienMaps?.trim();
  if (lienMaps) return lienMaps;

  const parts = [categoryId, item?.id, item?.nom, item?.localisation, item?.pays]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return parts.join('|') || 'unknown';
}

export function getCachedPlacePhotoMedia(cacheKey) {
  return mediaCache.get(cacheKey) || null;
}

export function setCachedPlacePhotoMedia(cacheKey, media) {
  if (!cacheKey || !media?.url) return;
  mediaCache.set(cacheKey, media);
}

export function runPlacePhotoLoad(cacheKey, loader) {
  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  const promise = Promise.resolve()
    .then(loader)
    .finally(() => {
      inflight.delete(cacheKey);
    });

  inflight.set(cacheKey, promise);
  return promise;
}
