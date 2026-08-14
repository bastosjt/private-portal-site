import { getCachedItems, isPrefetchComplete } from '../data/appDataCache.js';
import { getCachedSpaceSettingsDoc } from './space-settings.js';
import { fetchSpaceSettings, upsertApiUsage, upsertApiUsageSeeds } from '../firebase/spaceSettings.js';
import { getItemPlacePhotoName } from './place-photo-store.js';
import { devWarn } from './dev-log.js';

const STORAGE_KEY = 'ourspace.apiUsage.v2';
const PERSIST_DEBOUNCE_MS = 2500;

/** @type {Record<string, { id: string, name: string, period: 'month' | 'day' | null, limit: number | null, limitNote?: string }>} */
export const API_USAGE_SERVICES = {
  'google-places': {
    id: 'google-places',
    name: 'Google Places API',
    period: 'month',
    limit: 5000,
    limitNote: 'Crédit Google ~$200/mois',
  },
  tmdb: {
    id: 'tmdb',
    name: 'TMDB',
    period: 'month',
    limit: 5000,
    limitNote: 'Usage personnel estimé',
  },
  nominatim: {
    id: 'nominatim',
    name: 'Nominatim (OSM)',
    period: 'month',
    limit: 1000,
    limitNote: 'Usage raisonnable recommandé',
  },
  exabase: {
    id: 'exabase',
    name: 'Exabase',
    period: 'month',
    limit: 500,
    limitNote: 'Service optionnel',
  },
  frankfurter: {
    id: 'frankfurter',
    name: 'Frankfurter',
    period: 'month',
    limit: null,
    limitNote: 'Gratuit · compteur informatif',
  },
  ban: {
    id: 'ban',
    name: 'API Adresse (BAN)',
    period: 'month',
    limit: null,
    limitNote: 'Service public · compteur informatif',
  },
  photon: {
    id: 'photon',
    name: 'Photon (Komoot)',
    period: 'month',
    limit: null,
    limitNote: 'Service public · compteur informatif',
  },
};

const SUMMARY_SERVICE_IDS = ['google-places', 'tmdb', 'nominatim', 'exabase'];
const PLACE_COLLECTIONS = ['activities', 'restaurants', 'travels'];

/** Seeds saisis depuis les consoles fournisseurs (clé mois = YYYY-MM). */
const MANUAL_USAGE_SEEDS = {
  'google-places': {
    '2026-08': 3479,
  },
};

/** @type {Record<string, Record<string, number>> | null} */
let memoryStore = null;
let initPromise = null;
let persistTimer = null;
let persistInFlight = null;

function readLocalStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota / private mode
  }
}

function normalizeStore(raw) {
  if (!raw || typeof raw !== 'object') return {};

  const normalized = {};
  for (const [serviceId, bucket] of Object.entries(raw)) {
    if (!bucket || typeof bucket !== 'object') continue;
    const cleanBucket = {};
    for (const [periodKey, count] of Object.entries(bucket)) {
      const value = Number(count);
      if (Number.isFinite(value) && value > 0) cleanBucket[periodKey] = Math.floor(value);
    }
    if (Object.keys(cleanBucket).length) normalized[serviceId] = cleanBucket;
  }
  return normalized;
}

function mergeStores(...stores) {
  const merged = {};

  for (const store of stores) {
    const normalized = normalizeStore(store);
    for (const [serviceId, bucket] of Object.entries(normalized)) {
      if (!merged[serviceId]) merged[serviceId] = {};
      for (const [periodKey, count] of Object.entries(bucket)) {
        merged[serviceId][periodKey] = Math.max(merged[serviceId][periodKey] || 0, count);
      }
    }
  }

  return merged;
}

function readStore() {
  return memoryStore ?? readLocalStore();
}

function commitStore(store) {
  memoryStore = normalizeStore(store);
  writeLocalStore(memoryStore);
  schedulePersist();
}

const usageChangeListeners = new Set();

/** @param {(serviceId: string) => void} listener */
export function onApiUsageChange(listener) {
  usageChangeListeners.add(listener);
  return () => usageChangeListeners.delete(listener);
}

function notifyApiUsageChange(serviceId) {
  usageChangeListeners.forEach((listener) => {
    try {
      listener(serviceId);
    } catch (_) {
      /* ignore listener errors */
    }
  });
}

function getPeriodKey(period) {
  const now = new Date();
  if (period === 'day') {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (period === 'month') {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  return 'all';
}

function formatCount(value) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

function getPeriodLabel(period) {
  if (period === 'day') return 'aujourd\'hui';
  if (period === 'month') return 'ce mois';
  return 'total';
}

function getResetLabel(period) {
  if (period === 'day') return 'Minuit';
  if (period === 'month') return '1er du mois';
  return '—';
}

function estimateUsageFromAppData() {
  if (!isPrefetchComplete()) return {};

  const monthKey = getPeriodKey('month');
  const estimate = {};

  let googlePlaces = 0;
  for (const collectionId of PLACE_COLLECTIONS) {
    for (const item of getCachedItems(collectionId) || []) {
      if (getItemPlacePhotoName(item)) {
        googlePlaces += 2;
        continue;
      }
      if (item?.lienMaps?.trim()) {
        googlePlaces += 5;
        continue;
      }
      const lat = Number(item?.latitude);
      const lng = Number(item?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        googlePlaces += 3;
      }
    }
  }
  if (googlePlaces > 0) {
    estimate['google-places'] = { [monthKey]: googlePlaces };
  }

  let tmdb = 0;
  for (const item of getCachedItems('movies') || []) {
    if (item?.posterPath?.trim()) tmdb += 2;
  }
  if (tmdb > 0) {
    estimate.tmdb = { [monthKey]: tmdb };
  }

  let nominatim = 0;
  for (const item of getCachedItems('travels') || []) {
    if (item?.localisation?.trim() || item?.pays?.trim()) nominatim += 2;
  }
  if (nominatim > 0) {
    estimate.nominatim = { [monthKey]: nominatim };
  }

  let exabase = 0;
  for (const collectionId of PLACE_COLLECTIONS) {
    for (const item of getCachedItems(collectionId) || []) {
      if (item?.lienMaps?.trim()) exabase += 1;
    }
  }
  if (exabase > 0) {
    estimate.exabase = { [monthKey]: Math.min(exabase, 200) };
  }

  return estimate;
}

function normalizeSeedStore(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const normalized = {};

  for (const [serviceId, bucket] of Object.entries(raw)) {
    if (typeof bucket === 'number' && Number.isFinite(bucket) && bucket > 0) {
      const service = API_USAGE_SERVICES[serviceId];
      const periodKey = service?.period ? getPeriodKey(service.period) : getPeriodKey('month');
      normalized[serviceId] = { [periodKey]: Math.floor(bucket) };
      continue;
    }
    if (!bucket || typeof bucket !== 'object') continue;
    normalized[serviceId] = {};
    for (const [periodKey, count] of Object.entries(bucket)) {
      const value = Number(count);
      if (Number.isFinite(value) && value > 0) {
        normalized[serviceId][periodKey] = Math.floor(value);
      }
    }
  }

  return normalized;
}

async function persistStoreNow() {
  if (!memoryStore) return;

  const payload = memoryStore;
  persistInFlight = upsertApiUsage(payload).catch((err) => {
    devWarn('api usage persist:', err.message);
  }).finally(() => {
    if (persistInFlight) persistInFlight = null;
  });

  await persistInFlight;
}

function schedulePersist() {
  if (persistTimer) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    void persistStoreNow();
  }, PERSIST_DEBOUNCE_MS);
}

export async function initApiUsageTracking() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const remote = getCachedSpaceSettingsDoc() ?? await fetchSpaceSettings();
    const local = readLocalStore();
    const estimated = estimateUsageFromAppData();
    const seeds = normalizeSeedStore({
      ...remote?.apiUsageSeeds,
      ...MANUAL_USAGE_SEEDS,
    });

    const merged = mergeStores(local, remote?.apiUsage, estimated, seeds);
    memoryStore = merged;
    writeLocalStore(memoryStore);

    const remoteNormalized = normalizeStore(remote?.apiUsage);
    const changed = JSON.stringify(remoteNormalized) !== JSON.stringify(memoryStore);
    const remoteSeeds = normalizeSeedStore(remote?.apiUsageSeeds);
    const seedsChanged = JSON.stringify(remoteSeeds) !== JSON.stringify(seeds);

    if (changed) await persistStoreNow();
    if (seedsChanged) {
      await upsertApiUsageSeeds(seeds).catch((err) => {
        devWarn('api usage seeds persist:', err.message);
      });
    }
  })().catch((err) => {
    initPromise = null;
    memoryStore = normalizeStore(readLocalStore());
    devWarn('initApiUsageTracking:', err.message);
  });

  return initPromise;
}

function buildUsageSnapshot(serviceId) {
  const service = API_USAGE_SERVICES[serviceId];
  if (!service) return null;

  const store = readStore();
  const bucket = store[serviceId] && typeof store[serviceId] === 'object' ? store[serviceId] : {};
  const periodKey = service.period ? getPeriodKey(service.period) : 'all';
  const count = Number(bucket[periodKey]) || 0;
  const limit = Number.isFinite(service.limit) ? service.limit : null;
  const remaining = limit != null ? Math.max(0, limit - count) : null;
  const percent = limit != null && limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : null;

  let level = 'ok';
  if (limit != null && count >= limit) level = 'critical';
  else if (limit != null && count >= limit * 0.85) level = 'warn';

  return {
    ...service,
    count,
    limit,
    remaining,
    percent,
    level,
    periodKey,
    periodLabel: getPeriodLabel(service.period),
    resetLabel: getResetLabel(service.period),
    countLabel: formatCount(count),
    limitLabel: limit != null ? formatCount(limit) : null,
    remainingLabel: remaining != null ? formatCount(remaining) : null,
  };
}

export function trackApiRequest(serviceId) {
  const service = API_USAGE_SERVICES[serviceId];
  if (!service) return 0;

  const store = { ...readStore() };
  const periodKey = service.period ? getPeriodKey(service.period) : 'all';
  const bucket = store[serviceId] && typeof store[serviceId] === 'object' ? { ...store[serviceId] } : {};

  bucket[periodKey] = (Number(bucket[periodKey]) || 0) + 1;
  store[serviceId] = bucket;
  commitStore(store);
  notifyApiUsageChange(serviceId);

  return bucket[periodKey];
}

export function trackApiResponse(serviceId, response) {
  if (response?.ok) trackApiRequest(serviceId);
  return response;
}

export function getApiUsage(serviceId) {
  return buildUsageSnapshot(serviceId);
}

export function getApiUsageSummary() {
  return SUMMARY_SERVICE_IDS
    .map((id) => buildUsageSnapshot(id))
    .filter(Boolean);
}

export function resetApiUsage(serviceId = null) {
  const store = { ...readStore() };

  if (serviceId) {
    delete store[serviceId];
  } else {
    Object.keys(store).forEach((key) => delete store[key]);
  }

  commitStore(store);
}

/** Mappe le nom affiché dans le catalogue vers l’id de suivi. */
export function getApiUsageServiceIdForName(name) {
  const map = {
    'Google Places API': 'google-places',
    TMDB: 'tmdb',
    'Nominatim (OpenStreetMap)': 'nominatim',
    Frankfurter: 'frankfurter',
    Exabase: 'exabase',
    'API Adresse (BAN)': 'ban',
    'Photon (Komoot)': 'photon',
  };
  return map[name] || null;
}
