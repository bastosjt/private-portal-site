import { db } from '../firebase-config.js';
import {
  doc,
  getDoc,
  runTransaction,
  deleteDoc,
  Timestamp,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const LEGACY_STORAGE_KEY = 'portal-daily-picks';
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

function getLegacyTodayKeys() {
  const now = new Date();
  return [
    getTodayKey(),
    `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`,
  ];
}

function readLegacyPickIds() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw);
    for (const key of getLegacyTodayKeys()) {
      const ids = all[key];
      if (Array.isArray(ids) && ids.length) return ids;
    }
  } catch {
    /* ignore */
  }
  return [];
}

function clearLegacyTodayPicks() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw);
    for (const key of getLegacyTodayKeys()) delete all[key];
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function pickDocRef() {
  return doc(db, COLLECTION, getTodayKey());
}

export function getTodayPickIds(scope = 'activities') {
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

export function getPickQuotaLabel(scope = 'activities') {
  const remaining = getRemainingPicks(scope);
  if (remaining === 0) return 'Plus de pioches aujourd\'hui - à demain !';
  if (remaining === 1) return '1 pioche restante aujourd\'hui';
  return `${MAX_DAILY_PICKS} pioches disponibles aujourd'hui`;
}

export async function loadTodayPicks(scope = 'activities') {
  const resolvedScope = resolveScope(scope);
  const field = getScopeField(resolvedScope);
  const ref = pickDocRef();
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const ids = snap.data()?.[field];
    cachedPickIdsByScope[resolvedScope] = Array.isArray(ids) ? ids.slice(0, MAX_DAILY_PICKS) : [];
    return cachedPickIdsByScope[resolvedScope];
  }

  if (resolvedScope === 'activities') {
    const legacyIds = readLegacyPickIds();
    if (legacyIds.length) {
      cachedPickIdsByScope.activities = legacyIds.slice(0, MAX_DAILY_PICKS);
      try {
        await runTransaction(db, async (transaction) => {
          transaction.set(ref, {
            activityIds: cachedPickIdsByScope.activities,
            updatedAt: Timestamp.now(),
          }, { merge: true });
        });
        clearLegacyTodayPicks();
      } catch (err) {
        console.warn('dailyPicks migration:', err.message);
      }
      return cachedPickIdsByScope.activities;
    }
  }

  cachedPickIdsByScope[resolvedScope] = [];
  return cachedPickIdsByScope[resolvedScope];
}

export async function addTodayPick(itemId, scope = 'activities') {
  if (!itemId) return false;

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
  const resolvedScope = resolveScope(scope);
  const field = getScopeField(resolvedScope);
  cachedPickIdsByScope[resolvedScope] = [];

  if (resolvedScope === 'activities') {
    clearLegacyTodayPicks();
  }

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
