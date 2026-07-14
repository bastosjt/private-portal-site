import { MAP_THEME } from '../config.js';
import { lockScroll, unlockScroll } from './scroll-lock.js';
import { nextFrame, waitForTransition } from './transitions.js';

const LOCATE_CACHE_KEY = 'our-space-map-user-location';
const CONSENT_KEY = 'our-space-location-consent';
const LOCATE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MODAL_MS = 420;

let cachedLngLat = null;
let consentPromptPromise = null;
const listeners = new Set();

function notifyListeners() {
  for (const listener of listeners) {
    listener(cachedLngLat);
  }
}

function readConsent() {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    if (value === 'granted' || value === 'declined') return value;
    return null;
  } catch {
    return null;
  }
}

function writeConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // localStorage indisponible
  }
}

function readCachedUserLocation() {
  try {
    const raw = localStorage.getItem(LOCATE_CACHE_KEY);
    if (!raw) return null;
    const { lngLat, at } = JSON.parse(raw);
    if (!Array.isArray(lngLat) || lngLat.length !== 2) return null;
    if (Date.now() - at > LOCATE_CACHE_MAX_AGE_MS) return null;
    return lngLat;
  } catch {
    return null;
  }
}

function writeCachedUserLocation(lngLat) {
  try {
    localStorage.setItem(LOCATE_CACHE_KEY, JSON.stringify({ lngLat, at: Date.now() }));
  } catch {
    // localStorage indisponible
  }
}

function setCachedLngLat(lngLat) {
  cachedLngLat = lngLat;
  notifyListeners();
}

function restoreCachedLocation() {
  const stored = readCachedUserLocation();
  if (stored) setCachedLngLat(stored);
  return stored;
}

export function isUserLocationEnabled() {
  return readConsent() === 'granted';
}

export function getUserLocationLngLat() {
  if (!isUserLocationEnabled()) return null;
  if (!cachedLngLat) restoreCachedLocation();
  return cachedLngLat;
}

export function onUserLocationChange(listener) {
  listeners.add(listener);
  listener(isUserLocationEnabled() ? cachedLngLat : null);
  return () => listeners.delete(listener);
}

export function clearUserLocationState() {
  cachedLngLat = null;
  launchInitDone = false;
  launchInitPromise = null;
  consentPromptPromise = null;
  try {
    localStorage.removeItem(LOCATE_CACHE_KEY);
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    // ignore
  }
  notifyListeners();
}

function getGeolocationErrorMessage(error) {
  if (error?.code === 'disabled') {
    return 'Localisation désactivée dans les paramètres.';
  }

  switch (error?.code) {
    case 1:
      return 'Autorisez l’accès à votre position dans les réglages du navigateur.';
    case 2:
      return 'Position indisponible (souvent sur Mac sans Wi‑Fi). Activez la localisation et réessayez.';
    case 3:
      return 'La localisation a pris trop de temps. Réessayez.';
    default:
      return 'Impossible d’obtenir votre position.';
  }
}

function requestUserPosition({ enableHighAccuracy = false, timeout = 12000, maximumAge = 300000 } = {}) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    });
  });
}

function watchUserPositionOnce({ enableHighAccuracy = false, timeout = 12000, maximumAge = 300000 } = {}) {
  return new Promise((resolve, reject) => {
    let watchId = null;
    const timer = window.setTimeout(() => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      reject({ code: 3, message: 'timeout' });
    }, timeout);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        window.clearTimeout(timer);
        navigator.geolocation.clearWatch(watchId);
        resolve(position);
      },
      (error) => {
        window.clearTimeout(timer);
        if (watchId != null) navigator.geolocation.clearWatch(watchId);
        reject(error);
      },
      { enableHighAccuracy, maximumAge },
    );
  });
}

async function resolveUserPosition() {
  const attempts = [
    () => requestUserPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }),
    () => requestUserPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }),
    () => watchUserPositionOnce({ enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }),
  ];

  let lastError;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      if (error?.code === 1) throw error;
    }
  }

  throw lastError;
}

export async function refreshUserLocation({ silent = false } = {}) {
  if (!navigator.geolocation) {
    if (!silent) throw Object.assign(new Error('unavailable'), { code: 0 });
    return null;
  }

  try {
    const position = await resolveUserPosition();
    const lngLat = [position.coords.longitude, position.coords.latitude];
    writeCachedUserLocation(lngLat);
    setCachedLngLat(lngLat);
    return lngLat;
  } catch (error) {
    if (!silent) throw error;
    return cachedLngLat;
  }
}

export function getGeolocationUserMessage(error) {
  return getGeolocationErrorMessage(error);
}

function showLocationConsentPrompt() {
  if (consentPromptPromise) return consentPromptPromise;

  consentPromptPromise = new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'add-modal-overlay location-consent-overlay';
    overlay.id = 'location-consent-overlay';
    overlay.innerHTML = `
      <div class="add-modal location-consent-modal" data-theme="${MAP_THEME}" role="dialog" aria-modal="true" aria-labelledby="location-consent-title">
        <div class="add-modal-head">
          <button type="button" class="add-modal-back hidden" tabindex="-1" aria-hidden="true"></button>
          <h2 class="add-modal-title" id="location-consent-title">Localisation</h2>
          <button type="button" class="add-modal-close" id="location-consent-close" aria-label="Fermer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
        <div class="add-modal-body location-consent-body">
          <p class="location-consent-text">
            Activer votre position pour l’afficher sur la carte et retrouver plus facilement vos lieux autour de vous ?
          </p>
          <div class="location-consent-actions">
            <button type="button" class="act-detail-btn act-detail-btn--edit" id="location-consent-accept">
              Activer la localisation
            </button>
            <button type="button" class="act-detail-btn location-consent-decline" id="location-consent-decline">
              Plus tard
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const finish = async (consent) => {
      acceptBtn.disabled = true;
      declineBtn.disabled = true;
      closeBtn.disabled = true;

      overlay.classList.remove('is-active');
      document.body.classList.remove('modal-open');
      unlockScroll();
      await waitForTransition(overlay.querySelector('.add-modal') || overlay, MODAL_MS);
      overlay.remove();
      consentPromptPromise = null;
      resolve(consent);
    };

    const acceptBtn = overlay.querySelector('#location-consent-accept');
    const declineBtn = overlay.querySelector('#location-consent-decline');
    const closeBtn = overlay.querySelector('#location-consent-close');

    acceptBtn.addEventListener('click', () => finish('granted'));
    declineBtn.addEventListener('click', () => finish('declined'));
    closeBtn.addEventListener('click', () => finish('declined'));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish('declined');
    });

    lockScroll();
    document.body.classList.add('modal-open');
    nextFrame().then(() => overlay.classList.add('is-active'));
  });

  return consentPromptPromise;
}

let launchInitDone = false;
let launchInitPromise = null;

async function initUserLocationAtLaunchInner() {
  restoreCachedLocation();

  const consent = readConsent();
  if (consent === 'granted') {
    await refreshUserLocation({ silent: true });
    return;
  }

  if (consent === 'declined') return;

  const choice = await showLocationConsentPrompt();
  writeConsent(choice);

  if (choice === 'granted') {
    await refreshUserLocation({ silent: true });
  }
}

export function initUserLocationAtLaunch() {
  if (launchInitDone) return Promise.resolve();
  if (launchInitPromise) return launchInitPromise;

  launchInitPromise = initUserLocationAtLaunchInner()
    .then(() => {
      launchInitDone = true;
    })
    .finally(() => {
      launchInitPromise = null;
    });

  return launchInitPromise;
}

export function getUserLocationConsent() {
  return readConsent();
}

export async function enableUserLocationFromSettings() {
  writeConsent('granted');
  return refreshUserLocation({ silent: false });
}

function disableUserLocation() {
  writeConsent('declined');
  try {
    localStorage.removeItem(LOCATE_CACHE_KEY);
  } catch {
    // ignore
  }
  setCachedLngLat(null);
}

export async function requestUserLocationUpdate() {
  if (!isUserLocationEnabled()) {
    throw Object.assign(new Error('disabled'), { code: 'disabled' });
  }
  return refreshUserLocation({ silent: false });
}

export async function setUserLocationEnabled(enabled) {
  if (enabled) {
    writeConsent('granted');
    try {
      return await refreshUserLocation({ silent: true });
    } catch {
      return cachedLngLat;
    }
  }

  disableUserLocation();
  return null;
}
