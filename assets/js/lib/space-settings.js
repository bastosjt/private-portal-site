import { APP_TAGLINE } from '../config.js';
import { devWarn } from '../lib/dev-log.js';
import {
  fetchSpaceSettings,
  upsertActiveTravelId,
  upsertSpaceTagline,
} from '../firebase/spaceSettings.js';

let cachedTagline = '';
let cachedActiveTravelId = '';
let initPromise = null;

function normalizeTagline(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTravelId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function getSpaceTagline() {
  return cachedTagline || APP_TAGLINE;
}

export function getActiveTravelId() {
  return cachedActiveTravelId;
}

export async function setSpaceTagline(tagline) {
  const trimmed = normalizeTagline(tagline).slice(0, 48);
  if (!trimmed) return false;

  cachedTagline = trimmed;

  try {
    await upsertSpaceTagline(trimmed);
    return true;
  } catch (err) {
    devWarn('setSpaceTagline:', err.message);
    return false;
  }
}

export async function setActiveTravelId(travelId) {
  const next = normalizeTravelId(travelId);
  cachedActiveTravelId = next;

  try {
    await upsertActiveTravelId(next || null);
    return true;
  } catch (err) {
    devWarn('setActiveTravelId:', err.message);
    return false;
  }
}

export async function initSpaceSettings() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const remote = await fetchSpaceSettings();
    const tagline = normalizeTagline(remote?.tagline);
    cachedTagline = tagline || APP_TAGLINE;
    cachedActiveTravelId = normalizeTravelId(remote?.activeTravelId);
  })().catch((err) => {
    initPromise = null;
    cachedTagline = APP_TAGLINE;
    cachedActiveTravelId = '';
    devWarn('initSpaceSettings:', err.message);
  });

  return initPromise;
}

export function clearSpaceSettingsCache() {
  cachedTagline = '';
  cachedActiveTravelId = '';
  initPromise = null;
}
