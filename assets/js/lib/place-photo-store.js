import { updateItem } from '../firebase/firestore.js';
import { patchCachedItem } from '../data/appDataCache.js';
import { devWarn } from './dev-log.js';

export function getItemPlacePhotoName(item) {
  return item?.placePhotoName?.trim() || null;
}

export function persistPlacePhotoName(collectionId, itemId, photoName) {
  const normalized = photoName?.trim();
  if (!collectionId || !itemId || !normalized) return Promise.resolve(false);

  return updateItem(collectionId, itemId, { placePhotoName: normalized })
    .then(() => {
      patchCachedItem(collectionId, itemId, { placePhotoName: normalized });
      return true;
    })
    .catch((err) => {
      devWarn('place photo persist:', collectionId, itemId, err);
      return false;
    });
}
