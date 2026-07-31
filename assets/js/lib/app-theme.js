import { APP_THEMES, DEFAULT_APP_THEME, getAppThemeChromeColor, normalizeAppTheme } from '../config.js';
import {
  getCurrentUserUid,
  getUserAppTheme,
  setUserAppTheme,
} from './user-profile.js';

export { normalizeAppTheme } from '../config.js';

const LAST_USER_KEY = 'app-last-uid';

function themeStorageKey(uid) {
  return uid ? `app-theme:${uid}` : 'app-theme';
}

export function getAppTheme(uid = getCurrentUserUid()) {
  return getUserAppTheme(uid);
}

export function getAppThemeMeta(themeId = getAppTheme()) {
  const id = normalizeAppTheme(themeId);
  return APP_THEMES.find((theme) => theme.id === id) || APP_THEMES[0];
}

export function isNavyThemeActive(themeId = getAppTheme()) {
  return normalizeAppTheme(themeId) === 'navy';
}

export function isOrangeThemeActive(themeId = getAppTheme()) {
  return normalizeAppTheme(themeId) === 'orange';
}

export function isSunsetThemeActive(themeId = getAppTheme()) {
  return normalizeAppTheme(themeId) === 'sunset';
}

export function isForestThemeActive(themeId = getAppTheme()) {
  return normalizeAppTheme(themeId) === 'forest';
}

export function isVioletThemeActive(themeId = getAppTheme()) {
  return normalizeAppTheme(themeId) === 'violet';
}

export function isPinkThemeActive(themeId = getAppTheme()) {
  return normalizeAppTheme(themeId) === 'pink';
}

export function isMidnightThemeActive(themeId = getAppTheme()) {
  return normalizeAppTheme(themeId) === 'midnight';
}

export function isWarmGlassThemeActive(themeId = getAppTheme()) {
  const id = normalizeAppTheme(themeId);
  return id === 'orange' || id === 'sunset';
}

function persistThemeChoice(themeId, uid = getCurrentUserUid()) {
  const theme = normalizeAppTheme(themeId);
  try {
    if (uid) {
      localStorage.setItem(themeStorageKey(uid), theme);
      localStorage.setItem(LAST_USER_KEY, uid);
    }
  } catch {
    // ignore quota / private mode
  }
}

function readPersistedTheme(uid) {
  if (!uid) return null;
  try {
    const saved = localStorage.getItem(themeStorageKey(uid));
    return saved ? normalizeAppTheme(saved) : null;
  } catch {
    return null;
  }
}

function setThemeColorMeta(color) {
  document.querySelectorAll('meta[name="theme-color"]').forEach((node) => {
    node.remove();
  });

  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = color;
  document.head.appendChild(meta);
}

function syncBrowserChrome(themeId) {
  const theme = getAppThemeMeta(themeId);
  const chromeColor = getAppThemeChromeColor(themeId);
  const pageColor = theme.themeColor || '#062045';
  setThemeColorMeta(chromeColor);
  /* Fond html = themeColor (pas chromeColor) — évite la bande bleue sous les modales iOS */
  document.documentElement.style.backgroundColor = pageColor;

  requestAnimationFrame(() => {
    setThemeColorMeta(chromeColor);
    document.documentElement.style.backgroundColor = pageColor;
  });
}

/** Met à jour theme-color + fond html (safe area / barre de statut mobile). */
export function syncAppThemeBrowserChrome(themeId = getAppTheme()) {
  syncBrowserChrome(normalizeAppTheme(themeId));
}

/** Restaure le thème splash avant init Firestore (dernier user connu sur cet appareil). */
export function restoreSplashThemeHint() {
  try {
    const lastUid = localStorage.getItem(LAST_USER_KEY);
    const theme = readPersistedTheme(lastUid) || DEFAULT_APP_THEME;
    document.body.dataset.appTheme = theme;
    syncBrowserChrome(theme);
  } catch {
    // ignore quota / private mode
  }
}

/** Applique le thème visuel sur `body` (session connectée requise via `app-page`). */
export function applyAppTheme(themeId = getAppTheme()) {
  const theme = normalizeAppTheme(themeId);
  document.body.dataset.appTheme = theme;
  persistThemeChoice(theme);
  syncBrowserChrome(theme);
  window.dispatchEvent(new CustomEvent('app-theme-change', { detail: { theme } }));
}

/** Login / auth — toujours navy, sans écraser le choix persisté. */
export function applyAuthTheme() {
  document.body.dataset.appTheme = DEFAULT_APP_THEME;
  syncBrowserChrome(DEFAULT_APP_THEME);
  window.dispatchEvent(new CustomEvent('app-theme-change', { detail: { theme: DEFAULT_APP_THEME } }));
}

export async function setAppTheme(themeId, uid = getCurrentUserUid()) {
  const ok = await setUserAppTheme(uid, themeId);
  if (ok) applyAppTheme(normalizeAppTheme(themeId));
  return ok;
}

export function initAppTheme() {
  applyAppTheme(getAppTheme());
}
