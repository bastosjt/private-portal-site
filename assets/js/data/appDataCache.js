import { HOME_CATEGORIES } from '../config.js';
import { fetchAllItems } from '../firebase/firestore.js';
import { loadDailyPicks, resetDailyPicksLoadState } from '../firebase/dailyPicks.js';
import { Timestamp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

export const ITEM_COLLECTIONS = HOME_CATEGORIES.map((cat) => cat.id);

export const PICK_SCOPES = ['activities', 'restaurants', 'movies', 'travels'];

/** Chargées en priorité (splash + accueil). */
export const PRIMARY_COLLECTIONS = ['activities', 'restaurants', 'movies', 'wishlist'];
/** Différées en requestIdleCallback pour libérer le thread au first paint. */
export const SECONDARY_COLLECTIONS = ['travels'];
export const PRIMARY_PICK_SCOPES = ['activities', 'restaurants', 'movies'];
export const SECONDARY_PICK_SCOPES = ['travels'];

const itemsCache = new Map();
let prefetchPromise = null;
let secondaryPrefetchPromise = null;
let backgroundRefreshPromise = null;
let cacheLoadedAt = 0;
let lastRefreshStartedAt = 0;
const secondaryPrefetchListeners = new Set();

/** Cache périmé après 15 min — refresh silencieux au prochain trigger. */
const CACHE_STALE_MS = 15 * 60 * 1000;
/** Onglet caché ≥ 3 min → refresh au retour (sync entre les deux comptes). */
const TAB_HIDDEN_STALE_MS = 3 * 60 * 1000;
/** Anti-spam : max 1 refresh réseau toutes les 2 min. */
const MIN_REFRESH_INTERVAL_MS = 2 * 60 * 1000;

function markCacheFresh() {
  cacheLoadedAt = Date.now();
}

export function getCacheAgeMs() {
  if (!cacheLoadedAt) return Infinity;
  return Date.now() - cacheLoadedAt;
}

export function shouldBackgroundRefresh({ hiddenDurationMs = 0 } = {}) {
  if (!isPrefetchComplete()) return false;
  if (backgroundRefreshPromise) return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;

  const now = Date.now();
  if (lastRefreshStartedAt && now - lastRefreshStartedAt < MIN_REFRESH_INTERVAL_MS) {
    return false;
  }

  if (getCacheAgeMs() >= CACHE_STALE_MS) return true;
  if (hiddenDurationMs >= TAB_HIDDEN_STALE_MS) return true;
  return false;
}

async function runBackgroundRefresh() {
  await Promise.all([
    ...ITEM_COLLECTIONS.map((collection) => ensureItems(collection, { force: true })),
    ...PICK_SCOPES.map((scope) => loadDailyPicks(scope, { force: true })),
  ]);
  markCacheFresh();
}

/**
 * Refresh silencieux si le cache est périmé ou l'onglet était longtemps caché.
 * Non bloquant — retourne null si aucun refresh n'est nécessaire.
 */
export function scheduleBackgroundRefreshIfNeeded({ hiddenDurationMs = 0 } = {}) {
  if (!shouldBackgroundRefresh({ hiddenDurationMs })) return null;

  lastRefreshStartedAt = Date.now();
  backgroundRefreshPromise = runBackgroundRefresh()
    .catch((err) => {
      console.warn('scheduleBackgroundRefreshIfNeeded:', err.message);
    })
    .finally(() => {
      backgroundRefreshPromise = null;
    });

  return backgroundRefreshPromise;
}

function scheduleIdleWork(callback) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => callback(), { timeout: 2500 });
  } else {
    setTimeout(callback, 16);
  }
}

function notifySecondaryPrefetchDone() {
  secondaryPrefetchListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn('secondaryPrefetch listener:', err);
    }
  });
}

function scheduleSecondaryPrefetch() {
  if (secondaryPrefetchPromise) return secondaryPrefetchPromise;

  secondaryPrefetchPromise = new Promise((resolve) => {
    scheduleIdleWork(async () => {
      try {
        await Promise.all([
          ...SECONDARY_COLLECTIONS.map((collection) => ensureItems(collection)),
          ...SECONDARY_PICK_SCOPES.map((scope) => loadDailyPicks(scope)),
        ]);
        markCacheFresh();
        notifySecondaryPrefetchDone();
      } catch (err) {
        console.warn('scheduleSecondaryPrefetch:', err.message);
      } finally {
        resolve();
      }
    });
  });

  return secondaryPrefetchPromise;
}

export function onSecondaryPrefetchDone(listener) {
  secondaryPrefetchListeners.add(listener);
  return () => secondaryPrefetchListeners.delete(listener);
}

function getItemCreatedAtMs(item) {
  const createdAt = item?.createdAt;
  if (!createdAt) return 0;
  if (typeof createdAt.toDate === 'function') return createdAt.toDate().getTime();
  if (createdAt instanceof Date) return createdAt.getTime();
  const parsed = new Date(createdAt).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function hasCachedItems(collectionName) {
  return itemsCache.has(collectionName);
}

export function getCachedItems(collectionName) {
  return itemsCache.get(collectionName) ?? null;
}

export function findCachedItemById(collectionName, itemId) {
  const items = itemsCache.get(collectionName);
  if (!items || !itemId) return null;
  return items.find((item) => item.id === itemId) ?? null;
}

export function getCollectionCountFromCache(collectionName) {
  return itemsCache.get(collectionName)?.length ?? 0;
}

export function getRecentItemsFromCache(collectionName, max = 3) {
  const items = itemsCache.get(collectionName);
  if (!items) return [];
  return items.slice(0, max);
}

export function getWeekItemsCountFromCache(collectionNames) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);
  const since = weekAgo.getTime();

  return collectionNames.reduce((sum, name) => {
    const items = itemsCache.get(name) ?? [];
    return sum + items.filter((item) => getItemCreatedAtMs(item) >= since).length;
  }, 0);
}

export async function ensureItems(collectionName, { force = false } = {}) {
  if (!force && itemsCache.has(collectionName)) {
    return itemsCache.get(collectionName);
  }

  const items = await fetchAllItems(collectionName);
  itemsCache.set(collectionName, items);
  return items;
}

export async function refreshCollection(collectionName) {
  return ensureItems(collectionName, { force: true });
}

export function patchCachedItem(collectionName, itemId, partial) {
  const items = itemsCache.get(collectionName);
  if (!items || !itemId) return false;

  const index = items.findIndex((item) => item.id === itemId);
  if (index < 0) return false;

  items[index] = {
    ...items[index],
    ...partial,
    updatedAt: partial.updatedAt ?? Timestamp.now(),
  };
  return true;
}

export function removeCachedItem(collectionName, itemId) {
  if (!itemsCache.has(collectionName) || !itemId) return false;

  const next = itemsCache.get(collectionName).filter((item) => item.id !== itemId);
  itemsCache.set(collectionName, next);
  return true;
}

export function upsertCachedItem(collectionName, item) {
  if (!item?.id) return false;

  const items = itemsCache.get(collectionName) ?? [];
  const index = items.findIndex((entry) => entry.id === item.id);

  if (index >= 0) {
    items[index] = { ...items[index], ...item };
  } else {
    items.unshift(item);
  }

  itemsCache.set(collectionName, items);
  return true;
}

/** Met à jour le cache après une écriture Firestore, sans re-fetch. */
export function syncCachedItemWrite(collectionName, itemId, { deleted = false, patch = null, item = null } = {}) {
  if (deleted) return removeCachedItem(collectionName, itemId);
  if (item) return upsertCachedItem(collectionName, item);
  if (patch) return patchCachedItem(collectionName, itemId, patch);
  return false;
}

export function prefetchAppData() {
  if (prefetchPromise) return prefetchPromise;

  prefetchPromise = Promise.all([
    ...PRIMARY_COLLECTIONS.map((collection) => ensureItems(collection)),
    ...PRIMARY_PICK_SCOPES.map((scope) => loadDailyPicks(scope)),
  ])
    .then(() => {
      markCacheFresh();
      scheduleSecondaryPrefetch();
    })
    .catch((err) => {
      prefetchPromise = null;
      throw err;
    });

  return prefetchPromise;
}

export function ensurePrefetch() {
  return prefetchAppData();
}

export function isPrefetchComplete() {
  return PRIMARY_COLLECTIONS.every((collection) => itemsCache.has(collection));
}

export function isFullPrefetchComplete() {
  return ITEM_COLLECTIONS.every((collection) => itemsCache.has(collection));
}

export function clearAppDataCache() {
  itemsCache.clear();
  prefetchPromise = null;
  secondaryPrefetchPromise = null;
  backgroundRefreshPromise = null;
  cacheLoadedAt = 0;
  lastRefreshStartedAt = 0;
  resetDailyPicksLoadState();
}

/** Recharge toutes les collections et pioches depuis Firestore. */
export function refreshAppData() {
  lastRefreshStartedAt = Date.now();
  backgroundRefreshPromise = runBackgroundRefresh()
    .catch((err) => {
      console.warn('refreshAppData:', err.message);
      throw err;
    })
    .finally(() => {
      backgroundRefreshPromise = null;
    });

  return backgroundRefreshPromise;
}
