import { ensureItems, getCachedItems, patchCachedItem } from '../data/appDataCache.js';
import { getMapsUrl } from './item-location.js';
import { sanitizeHttpsUrl } from './safe-url.js';
import { updateItem } from '../firebase/firestore.js';
import { ensureAuthSession } from '../auth/ensure-auth.js';
import { devWarn } from './dev-log.js';

const STORAGE_KEY = 'portal-place-maps-link-backfill-v1';
const PLACE_COLLECTIONS = ['activities', 'restaurants'];

export async function backfillMissingPlaceMapsLinks() {
  if (localStorage.getItem(STORAGE_KEY)) return;

  try {
    await ensureAuthSession();
  } catch {
    return;
  }

  await Promise.all(PLACE_COLLECTIONS.map((collectionId) => ensureItems(collectionId)));

  const tasks = [];

  for (const collectionId of PLACE_COLLECTIONS) {
    for (const item of getCachedItems(collectionId)) {
      if (sanitizeHttpsUrl(item.lienMaps)) continue;

      const mapsUrl = getMapsUrl(item, collectionId);
      if (!mapsUrl) continue;

      tasks.push(
        updateItem(collectionId, item.id, { lienMaps: mapsUrl })
          .then(() => patchCachedItem(collectionId, item.id, { lienMaps: mapsUrl }))
          .catch((err) => devWarn('place maps link backfill:', collectionId, item.id, err)),
      );
    }
  }

  if (tasks.length) await Promise.allSettled(tasks);
  localStorage.setItem(STORAGE_KEY, '1');
}
