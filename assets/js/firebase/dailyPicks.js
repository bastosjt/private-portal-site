import { db } from './config.js';
import {
  doc,
  getDoc,
  runTransaction,
  deleteDoc,
  Timestamp,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const COLLECTION = 'dailyPicks';
const FALLBACK_LOOKBACK_DAYS = 14;

export const MAX_DAILY_PICKS = 2;

const SCOPE_FIELDS = {
  activities: 'activityIds',
  restaurants: 'restaurantIds',
  movies: 'movieIds',
  travels: 'travelIds',
};

const cachedPickIdsByScope = {
  activities: [],
  restaurants: [],
  movies: [],
  travels: [],
};

const cachedYesterdayPickIdsByScope = {
  activities: [],
  restaurants: [],
  movies: [],
  travels: [],
};

const cachedFallbackPickByScope = {
  activities: null,
  restaurants: null,
  movies: null,
  travels: null,
};

const resetListeners = new Set();
let cachedDateKey = null;
let midnightTimer = null;

function resolveScope(scope = 'activities') {
  return SCOPE_FIELDS[scope] ? scope : 'activities';
}

function getScopeField(scope = 'activities') {
  return SCOPE_FIELDS[resolveScope(scope)];
}

export function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayKey() {
  const { key } = getDayKeyWithOffset(1);
  return key;
}

function getDayKeyWithOffset(daysAgo = 0) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return {
    key: `${y}-${m}-${d}`,
    daysAgo,
  };
}

function getLatestId(ids) {
  return Array.isArray(ids) && ids.length ? ids[ids.length - 1] : null;
}

function buildDisplayedPick(id, period, daysAgo = 0) {
  if (!id) return null;
  return {
    id,
    period,
    daysAgo,
    isYesterday: period === 'yesterday',
  };
}

function getFallbackPick(scope = 'activities') {
  syncCacheWithToday();
  return cachedFallbackPickByScope[resolveScope(scope)];
}

function isFallbackDocValid(ids) {
  return Array.isArray(ids) && ids.length > 0;
}

function normalizePickIds(rawIds) {
  return Array.isArray(rawIds) ? rawIds.slice(0, MAX_DAILY_PICKS) : [];
}

async function loadFallbackPick(scope = 'activities', lookbackDays = FALLBACK_LOOKBACK_DAYS) {
  syncCacheWithToday();

  const resolvedScope = resolveScope(scope);
  const field = getScopeField(resolvedScope);

  cachedFallbackPickByScope[resolvedScope] = null;

  for (let daysAgo = 2; daysAgo <= lookbackDays; daysAgo += 1) {
    const { key } = getDayKeyWithOffset(daysAgo);
    const snap = await getDoc(pickDocRef(key));
    if (!snap.exists()) continue;

    const ids = normalizePickIds(snap.data()?.[field]);
    if (!isFallbackDocValid(ids)) continue;

    cachedFallbackPickByScope[resolvedScope] = {
      id: getLatestId(ids),
      daysAgo,
    };
    return cachedFallbackPickByScope[resolvedScope];
  }

  return null;
}

function clearScopeCache(scope) {
  cachedPickIdsByScope[scope] = [];
  cachedYesterdayPickIdsByScope[scope] = [];
  cachedFallbackPickByScope[scope] = null;
}

function refreshInMemoryFallbackForScope(scope) {
  const resolvedScope = resolveScope(scope);
  const todayId = getLatestPickId(resolvedScope);
  if (todayId) {
    cachedFallbackPickByScope[resolvedScope] = null;
    return;
  }

  const yesterdayId = getLatestYesterdayPickId(resolvedScope);
  if (yesterdayId) {
    cachedFallbackPickByScope[resolvedScope] = null;
  }
}

function runResetListeners() {
  resetListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn('dailyPickReset listener:', err);
    }
  });
}

function ensureMaxLookbackDays(value) {
  return Math.max(2, Number.isFinite(value) ? Math.floor(value) : FALLBACK_LOOKBACK_DAYS);
}

function getScopeFieldValue(data, field) {
  return normalizePickIds(data?.[field]);
}

function readScopeIdsFromSnapshot(snap, field) {
  if (!snap.exists()) return [];
  return getScopeFieldValue(snap.data(), field);
}

function updateTodayCache(scope, ids) {
  cachedPickIdsByScope[scope] = ids;
}

function updateYesterdayCache(scope, ids) {
  cachedYesterdayPickIdsByScope[scope] = ids;
}

function syncCacheWithToday() {
  const today = getTodayKey();
  if (cachedDateKey === today) return false;

  cachedDateKey = today;
  for (const scope of Object.keys(cachedPickIdsByScope)) clearScopeCache(scope);
  return true;
}

function getMsUntilMidnight() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(0, nextMidnight.getTime() - now.getTime());
}

async function handleMidnightReset() {
  syncCacheWithToday();
  await Promise.all(Object.keys(SCOPE_FIELDS).map((scope) => loadDailyPicks(scope)));
  runResetListeners();
}

function scheduleMidnightReset() {
  clearTimeout(midnightTimer);
  midnightTimer = setTimeout(async () => {
    await handleMidnightReset();
    scheduleMidnightReset();
  }, getMsUntilMidnight() + 50);
}

export function startDailyPickMidnightReset(listener) {
  syncCacheWithToday();
  if (listener) resetListeners.add(listener);
  scheduleMidnightReset();

  return () => {
    if (listener) resetListeners.delete(listener);
    if (resetListeners.size === 0) clearTimeout(midnightTimer);
  };
}

function pickDocRef(dateKey = getTodayKey()) {
  return doc(db, COLLECTION, dateKey);
}

export function getTodayPickIds(scope = 'activities') {
  syncCacheWithToday();
  return cachedPickIdsByScope[resolveScope(scope)];
}

export function getRemainingPicks(scope = 'activities') {
  return Math.max(0, MAX_DAILY_PICKS - getTodayPickIds(scope).length);
}

export function canPickToday(scope = 'activities') {
  return getRemainingPicks(scope) > 0;
}

export function getLatestPickId(scope = 'activities') {
  const ids = getTodayPickIds(scope);
  return getLatestId(ids);
}

export function getLatestYesterdayPickId(scope = 'activities') {
  syncCacheWithToday();
  const ids = cachedYesterdayPickIdsByScope[resolveScope(scope)];
  return getLatestId(ids);
}

export function getDisplayedLatestPick(scope = 'activities') {
  const todayId = getLatestPickId(scope);
  if (todayId) return buildDisplayedPick(todayId, 'today', 0);

  const yesterdayId = getLatestYesterdayPickId(scope);
  if (yesterdayId) return buildDisplayedPick(yesterdayId, 'yesterday', 1);

  const fallback = getFallbackPick(scope);
  if (fallback?.id) return buildDisplayedPick(fallback.id, 'recent', fallback.daysAgo || 2);

  return null;
}

export function getPickQuotaLabel(scope = 'activities') {
  const remaining = getRemainingPicks(scope);
  if (remaining === 0) return 'Plus de pioches aujourd\'hui - à demain !';
  if (remaining === 1) return '1 pioche restante aujourd\'hui';
  return `${MAX_DAILY_PICKS} pioches disponibles aujourd'hui`;
}

export async function loadTodayPicks(scope = 'activities') {
  syncCacheWithToday();

  const resolvedScope = resolveScope(scope);
  const field = getScopeField(resolvedScope);
  const ref = pickDocRef(getTodayKey());
  const snap = await getDoc(ref);
  const ids = readScopeIdsFromSnapshot(snap, field);
  updateTodayCache(resolvedScope, ids);
  refreshInMemoryFallbackForScope(resolvedScope);
  return cachedPickIdsByScope[resolvedScope];
}

export async function loadYesterdayPicks(scope = 'activities') {
  syncCacheWithToday();

  const resolvedScope = resolveScope(scope);
  const field = getScopeField(resolvedScope);
  const ref = pickDocRef(getYesterdayKey());
  const snap = await getDoc(ref);
  const ids = readScopeIdsFromSnapshot(snap, field);
  updateYesterdayCache(resolvedScope, ids);
  refreshInMemoryFallbackForScope(resolvedScope);
  return cachedYesterdayPickIdsByScope[resolvedScope];
}

export async function loadDailyPicks(scope = 'activities') {
  const lookback = ensureMaxLookbackDays(FALLBACK_LOOKBACK_DAYS);
  await Promise.all([loadTodayPicks(scope), loadYesterdayPicks(scope), loadFallbackPick(scope, lookback)]);
  refreshInMemoryFallbackForScope(scope);
  return getTodayPickIds(scope);
}

export async function addTodayPick(itemId, scope = 'activities') {
  if (!itemId) return false;

  syncCacheWithToday();

  const resolvedScope = resolveScope(scope);
  const field = getScopeField(resolvedScope);
  const ref = pickDocRef();

  try {
    const nextIds = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      const current = snap.exists() && Array.isArray(snap.data()?.[field])
        ? snap.data()[field]
        : [];

      if (current.length >= MAX_DAILY_PICKS) return null;
      if (current.includes(itemId)) return current;

      const updated = [...current, itemId];
      transaction.set(ref, {
        [field]: updated,
        updatedAt: Timestamp.now(),
      }, { merge: true });
      return updated;
    });

    if (!nextIds) return false;
    cachedPickIdsByScope[resolvedScope] = nextIds;
    refreshInMemoryFallbackForScope(resolvedScope);
    return true;
  } catch (err) {
    console.error('addTodayPick:', err);
    return false;
  }
}

export async function resetTodayPicks(scope = 'activities') {
  syncCacheWithToday();

  const resolvedScope = resolveScope(scope);
  const field = getScopeField(resolvedScope);
  cachedPickIdsByScope[resolvedScope] = [];
  refreshInMemoryFallbackForScope(resolvedScope);

  try {
    const ref = pickDocRef();
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data() || {};
    const nextData = { ...data };
    delete nextData[field];

    const hasOtherPicks = Object.keys(SCOPE_FIELDS).some((key) => {
      const otherField = SCOPE_FIELDS[key];
      if (otherField === field) return false;
      return Array.isArray(nextData[otherField]) && nextData[otherField].length > 0;
    });

    if (hasOtherPicks) {
      await runTransaction(db, async (transaction) => {
        transaction.set(ref, {
          ...nextData,
          updatedAt: Timestamp.now(),
        });
      });
    } else {
      await deleteDoc(ref);
    }
  } catch (err) {
    console.warn('resetTodayPicks:', err.message);
  }
}
