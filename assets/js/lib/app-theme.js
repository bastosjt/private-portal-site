import { APP_THEMES, DEFAULT_APP_THEME, getAppThemeChromeColor, normalizeAppTheme } from '../config.js';
import { getSpaceTheme } from './space-settings.js';

export { normalizeAppTheme } from '../config.js';

const THEME_STORAGE_KEY = 'app-theme';

export function getAppThemeMeta(themeId = getSpaceTheme()) {
  const id = normalizeAppTheme(themeId);
  return APP_THEMES.find((theme) => theme.id === id) || APP_THEMES[0];
}

export function isNavyThemeActive(themeId = getSpaceTheme()) {
  return normalizeAppTheme(themeId) === 'navy';
}

export function isOrangeThemeActive(themeId = getSpaceTheme()) {
  return normalizeAppTheme(themeId) === 'orange';
}

export function isSunsetThemeActive(themeId = getSpaceTheme()) {
  return normalizeAppTheme(themeId) === 'sunset';
}

export function isForestThemeActive(themeId = getSpaceTheme()) {
  return normalizeAppTheme(themeId) === 'forest';
}

export function isVioletThemeActive(themeId = getSpaceTheme()) {
  return normalizeAppTheme(themeId) === 'violet';
}

export function isPinkThemeActive(themeId = getSpaceTheme()) {
  return normalizeAppTheme(themeId) === 'pink';
}

export function isMidnightThemeActive(themeId = getSpaceTheme()) {
  return normalizeAppTheme(themeId) === 'midnight';
}

export function isWarmGlassThemeActive(themeId = getSpaceTheme()) {
  const id = normalizeAppTheme(themeId);
  return id === 'orange' || id === 'sunset';
}

function persistThemeChoice(themeId) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalizeAppTheme(themeId));
  } catch {
    // ignore quota / private mode
  }
}

function syncBrowserChrome(themeId) {
  const color = getAppThemeChromeColor(themeId);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = color;
  document.documentElement.style.backgroundColor = color;
}

/** Met à jour theme-color + fond html (safe area / barre de statut mobile). */
export function syncAppThemeBrowserChrome(themeId = getSpaceTheme()) {
  syncBrowserChrome(normalizeAppTheme(themeId));
}

/** Restaure le dernier thème connu pour le splash (avant init Firestore). */
export function restoreSplashThemeHint() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const theme = saved ? normalizeAppTheme(saved) : DEFAULT_APP_THEME;
    document.body.dataset.appTheme = theme;
    syncBrowserChrome(theme);
  } catch {
    // ignore quota / private mode
  }
}

/** Applique le thème visuel sur `body` (session connectée requise via `app-page`). */
export function applyAppTheme(themeId = getSpaceTheme()) {
  const theme = normalizeAppTheme(themeId);
  document.body.dataset.appTheme = theme;
  persistThemeChoice(theme);
  syncBrowserChrome(theme);
  window.dispatchEvent(new CustomEvent('app-theme-change', { detail: { theme } }));
}

export function initAppTheme() {
  applyAppTheme(getSpaceTheme());
}
