import { revokePlaceDetailMediaUrl } from '../lib/google-place-photo.js';
import { devWarn } from '../lib/dev-log.js';

const DETAIL_ICON_MIN_MS = 320;

function waitWithSignal(ms, signal) {
  if (ms <= 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

function preloadImageUrl(imageUrl, signal) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';

    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });

    img.onload = () => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    };
    img.onerror = () => {
      signal.removeEventListener('abort', onAbort);
      reject(new Error('detail image load failed'));
    };
    img.src = imageUrl;
  });
}

export function createPlaceDetailMediaLoader({ canLoad, fetchMedia, logLabel = 'place media' } = {}) {
  let photoAbortController = null;
  let activeMediaUrl = null;

  function releaseActiveMedia() {
    if (!activeMediaUrl) return;
    revokePlaceDetailMediaUrl(activeMediaUrl);
    activeMediaUrl = null;
  }

  function getActivePlaceMedia() {
    return activeMediaUrl ? { type: 'photo', url: activeMediaUrl } : null;
  }

  function cleanupPlaceMedia() {
    photoAbortController?.abort();
    photoAbortController = null;
    releaseActiveMedia();
  }

  async function loadPlaceMedia(item, { isCurrentItem, onLoaded, onSettled }) {
    if (!canLoad(item)) {
      onSettled?.(item, null);
      return;
    }

    photoAbortController?.abort();
    photoAbortController = new AbortController();
    const { signal } = photoAbortController;

    try {
      const placeMedia = await fetchMedia(item, { signal });
      if (!placeMedia || placeMedia.type !== 'photo' || !isCurrentItem(item)) {
        onSettled?.(item, null);
        return;
      }

      releaseActiveMedia();
      activeMediaUrl = placeMedia.url;
      onLoaded(item, placeMedia);
    } catch (err) {
      if (err.name !== 'AbortError') devWarn(`${logLabel}:`, err);
      if (isCurrentItem(item)) onSettled?.(item, null);
    }
  }

  return {
    loadPlaceMedia,
    releaseActiveMedia,
    cleanupPlaceMedia,
    getActivePlaceMedia,
  };
}

export function createDetailImageMediaLoader({
  getImageUrl,
  logLabel = 'detail image',
  minIconMs = DETAIL_ICON_MIN_MS,
} = {}) {
  let imageAbortController = null;
  let activeImageUrl = null;

  function canLoad(item) {
    return Boolean(getImageUrl(item));
  }

  function getActivePlaceMedia() {
    return activeImageUrl ? { type: 'photo', url: activeImageUrl } : null;
  }

  function cleanupPlaceMedia() {
    imageAbortController?.abort();
    imageAbortController = null;
    activeImageUrl = null;
  }

  async function loadPlaceMedia(item, { isCurrentItem, onLoaded, onSettled }) {
    const imageUrl = getImageUrl(item);
    if (!imageUrl) {
      onSettled?.(item, null);
      return;
    }

    imageAbortController?.abort();
    imageAbortController = new AbortController();
    const { signal } = imageAbortController;
    const loadStartedAt = performance.now();

    try {
      await preloadImageUrl(imageUrl, signal);
      if (!isCurrentItem(item)) return;

      await waitWithSignal(minIconMs - (performance.now() - loadStartedAt), signal);
      if (!isCurrentItem(item)) return;

      activeImageUrl = imageUrl;
      onLoaded(item, { type: 'photo', url: imageUrl });
    } catch (err) {
      if (err.name !== 'AbortError') devWarn(`${logLabel}:`, err);
      if (isCurrentItem(item)) onSettled?.(item, null);
    }
  }

  return {
    loadPlaceMedia,
    cleanupPlaceMedia,
    getActivePlaceMedia,
    canLoad,
  };
}
