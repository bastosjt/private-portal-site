import { APP_THEMES, DEFAULT_APP_THEME, normalizeAppTheme } from '../config.js';
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

function updateThemeColorMeta(themeId) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  meta.content = getAppThemeMeta(themeId).themeColor || '#0a0a0b';
}

/** Restaure le dernier thème connu pour le splash (avant init Firestore). */
export function restoreSplashThemeHint() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const theme = saved ? normalizeAppTheme(saved) : DEFAULT_APP_THEME;
    document.body.dataset.appTheme = theme;
    updateThemeColorMeta(theme);
    document.documentElement.style.backgroundColor = getAppThemeMeta(theme).themeColor || '#062045';
  } catch {
    // ignore quota / private mode
  }
}

/** Applique le thème visuel sur `body` (session connectée requise via `app-page`). */
export function applyAppTheme(themeId = getSpaceTheme()) {
  const theme = normalizeAppTheme(themeId);
  document.body.dataset.appTheme = theme;
  persistThemeChoice(theme);
  updateThemeColorMeta(theme);
  window.dispatchEvent(new CustomEvent('app-theme-change', { detail: { theme } }));
}

export function initAppTheme() {
  applyAppTheme(getSpaceTheme());
}
