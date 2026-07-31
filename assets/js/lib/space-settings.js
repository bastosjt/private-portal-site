import { APP_TAGLINE, DEFAULT_APP_THEME, normalizeAppTheme } from '../config.js';
import { devWarn } from '../lib/dev-log.js';
import {
  fetchSpaceSettings,
  upsertActiveTravelId,
  upsertSpaceTagline,
  upsertSpaceTheme,
} from '../firebase/spaceSettings.js';

let cachedTagline = '';
let cachedActiveTravelId = '';
let cachedTheme = DEFAULT_APP_THEME;
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

export function getSpaceTheme() {
  return cachedTheme || DEFAULT_APP_THEME;
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
  if (next === cachedActiveTravelId) return true;

  cachedActiveTravelId = next;

  try {
    await upsertActiveTravelId(next || null);
    return true;
  } catch (err) {
    devWarn('setActiveTravelId:', err.message);
    return false;
  }
}

export async function setSpaceTheme(themeId) {
  const next = normalizeAppTheme(themeId);
  if (next === cachedTheme) return true;

  cachedTheme = next;

  try {
    await upsertSpaceTheme(next);
    return true;
  } catch (err) {
    devWarn('setSpaceTheme:', err.message);
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
    cachedTheme = normalizeAppTheme(remote?.theme);
  })().catch((err) => {
    initPromise = null;
    cachedTagline = APP_TAGLINE;
    cachedActiveTravelId = '';
    cachedTheme = DEFAULT_APP_THEME;
    devWarn('initSpaceSettings:', err.message);
  });

  return initPromise;
}

export function clearSpaceSettingsCache() {
  cachedTagline = '';
  cachedActiveTravelId = '';
  cachedTheme = DEFAULT_APP_THEME;
  initPromise = null;
}
