const preloadedUrls = new Set();

export function isPlacePhotoPreloaded(url) {
  return Boolean(url && preloadedUrls.has(url));
}

/** Précharge une URL image déjà connue (aucun appel Places JSON). */
export function preloadPlacePhotoUrl(url, { signal } = {}) {
  const safeUrl = String(url || '').trim();
  if (!safeUrl) return Promise.resolve(false);
  if (preloadedUrls.has(safeUrl)) return Promise.resolve(true);

  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }

    const img = new Image();
    img.decoding = 'async';

    if (!safeUrl.includes('places.googleapis.com')) {
      img.referrerPolicy = 'no-referrer';
    }

    const finish = (ok) => {
      signal?.removeEventListener('abort', onAbort);
      if (ok) preloadedUrls.add(safeUrl);
      resolve(ok);
    };

    const onAbort = () => finish(false);

    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    signal?.addEventListener('abort', onAbort, { once: true });
    img.src = safeUrl;
  });
}
