import { db } from './config.js';
import {
  doc,
  getDoc,
  runTransaction,
  deleteDoc,
  Timestamp,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const COLLECTION = 'dailyPicks';

export const MAX_DAILY_PICKS = 2;

const SCOPE_FIELDS = {
  activities: 'activityIds',
  restaurants: 'restaurantIds',
};

const cachedPickIdsByScope = {
  activities: [],
  restaurants: [],
};

const cachedYesterdayPickIdsByScope = {
  activities: [],
  restaurants: [],
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
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const y = yesterday.getFullYear();
  const m = String(yesterday.getMonth() + 1).padStart(2, '0');
  const d = String(yesterday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function syncCacheWithToday() {
  const today = getTodayKey();
  if (cachedDateKey === today) return false;

  cachedDateKey = today;
  for (const scope of Object.keys(cachedPickIdsByScope)) {
    cachedPickIdsByScope[scope] = [];
    cachedYesterdayPickIdsByScope[scope] = [];
  }
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
  resetListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn('dailyPickReset listener:', err);
    }
  });
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
  return ids.length ? ids[ids.length - 1] : null;
}

export function getLatestYesterdayPickId(scope = 'activities') {
  syncCacheWithToday();
  const ids = cachedYesterdayPickIdsByScope[resolveScope(scope)];
  return ids.length ? ids[ids.length - 1] : null;
}

export function getDisplayedLatestPick(scope = 'activities') {
  const todayId = getLatestPickId(scope);
  if (todayId) return { id: todayId, isYesterday: false };

  const yesterdayId = getLatestYesterdayPickId(scope);
  if (yesterdayId) return { id: yesterdayId, isYesterday: true };

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

  if (snap.exists()) {
    const ids = snap.data()?.[field];
    cachedPickIdsByScope[resolvedScope] = Array.isArray(ids) ? ids.slice(0, MAX_DAILY_PICKS) : [];
    return cachedPickIdsByScope[resolvedScope];
  }

  cachedPickIdsByScope[resolvedScope] = [];
  return cachedPickIdsByScope[resolvedScope];
}

export async function loadYesterdayPicks(scope = 'activities') {
  syncCacheWithToday();

  const resolvedScope = resolveScope(scope);
  const field = getScopeField(resolvedScope);
  const ref = pickDocRef(getYesterdayKey());
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const ids = snap.data()?.[field];
    cachedYesterdayPickIdsByScope[resolvedScope] = Array.isArray(ids)
      ? ids.slice(0, MAX_DAILY_PICKS)
      : [];
    return cachedYesterdayPickIdsByScope[resolvedScope];
  }

  cachedYesterdayPickIdsByScope[resolvedScope] = [];
  return cachedYesterdayPickIdsByScope[resolvedScope];
}

export async function loadDailyPicks(scope = 'activities') {
  await Promise.all([loadTodayPicks(scope), loadYesterdayPicks(scope)]);
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
