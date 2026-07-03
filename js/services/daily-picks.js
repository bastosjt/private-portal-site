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

let cachedPickIds = [];

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

export function getTodayPickIds() {
  return cachedPickIds;
}

export function getRemainingPicks() {
  return Math.max(0, MAX_DAILY_PICKS - cachedPickIds.length);
}

export function canPickToday() {
  return getRemainingPicks() > 0;
}

export function getLatestPickId() {
  return cachedPickIds.length ? cachedPickIds[cachedPickIds.length - 1] : null;
}

export function getPickQuotaLabel() {
  const remaining = getRemainingPicks();
  if (remaining === 0) return 'Plus de pioches aujourd\'hui - à demain !';
  if (remaining === 1) return '1 pioche restante aujourd\'hui';
  return `${MAX_DAILY_PICKS} pioches disponibles aujourd'hui`;
}

export async function loadTodayPicks() {
  const ref = pickDocRef();
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const ids = snap.data()?.activityIds;
    cachedPickIds = Array.isArray(ids) ? ids.slice(0, MAX_DAILY_PICKS) : [];
    return cachedPickIds;
  }

  const legacyIds = readLegacyPickIds();
  if (legacyIds.length) {
    cachedPickIds = legacyIds.slice(0, MAX_DAILY_PICKS);
    try {
      await runTransaction(db, async (transaction) => {
        transaction.set(ref, {
          activityIds: cachedPickIds,
          updatedAt: Timestamp.now(),
        });
      });
      clearLegacyTodayPicks();
    } catch (err) {
      console.warn('dailyPicks migration:', err.message);
    }
    return cachedPickIds;
  }

  cachedPickIds = [];
  return cachedPickIds;
}

export async function addTodayPick(activityId) {
  if (!activityId) return false;

  const ref = pickDocRef();

  try {
    const nextIds = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      const current = snap.exists() && Array.isArray(snap.data()?.activityIds)
        ? snap.data().activityIds
        : [];

      if (current.length >= MAX_DAILY_PICKS) return null;
      if (current.includes(activityId)) return current;

      const updated = [...current, activityId];
      transaction.set(ref, {
        activityIds: updated,
        updatedAt: Timestamp.now(),
      });
      return updated;
    });

    if (!nextIds) return false;
    cachedPickIds = nextIds;
    return true;
  } catch (err) {
    console.error('addTodayPick:', err);
    return false;
  }
}

export async function resetTodayPicks() {
  cachedPickIds = [];
  clearLegacyTodayPicks();
  try {
    await deleteDoc(pickDocRef());
  } catch (err) {
    console.warn('resetTodayPicks:', err.message);
  }
}
