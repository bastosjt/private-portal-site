import { APP_TAGLINE } from '../config.js';
import { devWarn } from '../lib/dev-log.js';
import { fetchSpaceSettings, upsertSpaceTagline } from '../firebase/spaceSettings.js';

let cachedTagline = '';
let initPromise = null;

function normalizeTagline(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function getSpaceTagline() {
  return cachedTagline || APP_TAGLINE;
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

export async function initSpaceSettings() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const remote = await fetchSpaceSettings();
    const tagline = normalizeTagline(remote?.tagline);
    cachedTagline = tagline || APP_TAGLINE;
  })().catch((err) => {
    initPromise = null;
    cachedTagline = APP_TAGLINE;
    devWarn('initSpaceSettings:', err.message);
  });

  return initPromise;
}

export function clearSpaceSettingsCache() {
  cachedTagline = '';
  initPromise = null;
}
