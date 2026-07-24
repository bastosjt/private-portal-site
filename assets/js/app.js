import { auth } from './firebase/config.js';
import { devWarn, devError } from './lib/dev-log.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { login, logout } from './auth/login.js';
import { isAllowedUser } from './auth/session.js';
import { NAV_ITEMS, APP_NAME, APP_VERSION, SETTINGS_ITEM, renderVersionBadgeHtml } from './config.js';
import { initRouter, navigate } from './navigation/router.js';
import { renderSidebar, initSidebar, updateSidebarActive } from './ui/sidebar.js';
import { renderBottomNav, initBottomNav, updateBottomNavActive } from './bottom-nav.js';
import { initAddItem } from './ui/add-item.js';
import { waitForTransition, nextFrame } from './lib/transitions.js';
import { initSplash, dismissSplash } from './ui/splash.js';
import { prefetchAppData, clearAppDataCache, scheduleBackgroundRefreshIfNeeded, onSecondaryPrefetchDone, getMapMarkersFromCache } from './data/appDataCache.js';
import { preloadMapMarkerImages } from './pages/carte/map-marker-images.js';
import { resetMapWarmup } from './pages/carte/map-warmup.js';
import { initUserProfiles, clearUserProfilesCache } from './lib/user-profile.js';
import { initSpaceSettings, clearSpaceSettingsCache } from './lib/space-settings.js';
import { initUserLocationAtLaunch, clearUserLocationState } from './lib/user-location.js';
import { debounce } from './lib/debounce.js';
import { init as initAccueil, destroy as destroyAccueil, refresh as refreshAccueil, HOME_VIEW_HTML } from './pages/accueil/index.js';
import { initCustomOptions } from './lib/custom-types.js';
import { startDailyPickMidnightReset } from './firebase/dailyPicks.js';
import { init as initActivites, destroy as destroyActivites, refresh as refreshActivites, ACTIVITIES_VIEW_HTML } from './pages/activites/index.js';
import { init as initRestaurants, destroy as destroyRestaurants, refresh as refreshRestaurants, RESTAURANTS_VIEW_HTML } from './pages/restaurants/index.js';
import { init as initFilms, destroy as destroyFilms, refresh as refreshFilms, FILMS_VIEW_HTML } from './pages/films/index.js';
import { init as initWishlist, destroy as destroyWishlist, refresh as refreshWishlist, WISHLIST_VIEW_HTML } from './pages/wishlist/index.js';
import { init as initVoyages, destroy as destroyVoyages, refresh as refreshVoyages, VOYAGES_VIEW_HTML } from './pages/voyages/index.js';
import { init as initCarte, destroy as destroyCarte, refresh as refreshCarte, MAP_VIEW_HTML } from './pages/carte/index.js';
import { init as initParametres, destroy as destroyParametres, refresh as refreshParametres, SETTINGS_VIEW_HTML } from './pages/parametres/index.js';
import { init as initExplorer, destroy as destroyExplorer, refresh as refreshExplorer, EXPLORER_VIEW_HTML } from './pages/explorer/index.js';
import { getPlaceholderViewHtml } from './navigation/placeholder.js';
import { EXPLORER_ROUTE } from './navigation/router.js';

const PAGE_TITLES = {
  accueil: 'Accueil',
  explorer: 'Explorer',
  carte: 'Carte interactive',
  activites: 'Activités',
  restaurants: 'Restaurants',
  films: 'Films & Séries',
  voyages: 'Voyages',
  wishlist: 'Wishlist',
  parametres: 'Paramètres',
};

let currentUser = null;
let currentRoute = null;
let addItemModal = null;
let stopRouter = null;
let sidebarInitialized = false;
let bottomNavInitialized = false;
let pageTransitionToken = 0;
let stopDailyPickReset = null;
let splashActive = true;
let splashHandling = false;
let tabHiddenAt = null;
let resolveBootMount;
const bootMountDone = new Promise((resolve) => {
  resolveBootMount = resolve;
});
let bootMountResolved = false;

const PAGE_TRANSITION_MS = 300;

const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const pageRoot = document.getElementById('page-root');
const sidebarRoot = document.getElementById('sidebar-root');
const bottomNavRoot = document.getElementById('bottom-nav-root');

function markBootMountDone() {
  if (bootMountResolved) return;
  bootMountResolved = true;
  resolveBootMount?.();
}

function setPageTitle(routeId) {
  const label = PAGE_TITLES[routeId] || APP_NAME;
  document.title = `${label} — ${APP_NAME}`;
}

function destroyCurrentView() {
  destroyAccueil();
  destroyCarte();
  destroyActivites();
  destroyRestaurants();
  destroyFilms();
  destroyWishlist();
  destroyVoyages();
  destroyParametres();
  destroyExplorer();
}

function refreshCurrentViewNow() {
  if (currentRoute === 'accueil') return refreshAccueil();
  if (currentRoute === 'carte') return refreshCarte();
  if (currentRoute === 'activites') return refreshActivites();
  if (currentRoute === 'restaurants') return refreshRestaurants();
  if (currentRoute === 'films') return refreshFilms();
  if (currentRoute === 'wishlist') return refreshWishlist();
  if (currentRoute === 'voyages') return refreshVoyages();
  if (currentRoute === 'parametres') return refreshParametres();
  if (currentRoute === EXPLORER_ROUTE) return refreshExplorer();
  return undefined;
}

const refreshCurrentView = debounce(refreshCurrentViewNow, 250);

function ensureSharedAddItem(user) {
  if (addItemModal) return addItemModal;

  addItemModal = initAddItem({
    user,
    onAdded: () => refreshCurrentView(),
    onUpdated: () => refreshCurrentView(),
  });

  return addItemModal;
}

function syncStaleDataIfNeeded({ hiddenDurationMs = 0 } = {}) {
  const refresh = scheduleBackgroundRefreshIfNeeded({ hiddenDurationMs });
  if (!refresh) return;

  refresh.then(() => {
    if (currentUser) refreshCurrentView();
  });
}

onSecondaryPrefetchDone(() => {
  void preloadMapMarkerImages(getMapMarkersFromCache());
  if (currentUser && !splashActive) refreshCurrentView();
});

async function mountRoute(routeId) {
  if (!currentUser || !pageRoot) {
    markBootMountDone();
    return;
  }

  syncStaleDataIfNeeded();

  const token = ++pageTransitionToken;
  const hasContent = pageRoot.innerHTML.trim().length > 0;

  try {
  if (hasContent) {
    pageRoot.classList.add('is-page-leaving');
    await waitForTransition(pageRoot, PAGE_TRANSITION_MS);
    if (token !== pageTransitionToken) return;
  }

  destroyCurrentView();
  currentRoute = routeId;
  setPageTitle(routeId);
  updateSidebarActive(routeId);
  updateBottomNavActive(routeId);
  document.body.classList.toggle('route-no-fab', routeId === 'parametres' || routeId === 'carte');

  document.body.classList.toggle('app-page', true);
  document.body.classList.remove('auth-page');

  const sharedModal = ensureSharedAddItem(currentUser);

  const finishPageEnter = async () => {
    if (!hasContent) {
      pageRoot.classList.remove('is-page-leaving');
      return;
    }
    pageRoot.classList.add('is-page-entering');
    await nextFrame();
    pageRoot.classList.remove('is-page-leaving', 'is-page-entering');
  };

  if (routeId === 'accueil') {
    pageRoot.innerHTML = HOME_VIEW_HTML;
    await finishPageEnter();
    if (token !== pageTransitionToken) return;
    await initAccueil(currentUser, { addItemModal: sharedModal });
    return;
  }

  if (routeId === 'carte') {
    pageRoot.innerHTML = MAP_VIEW_HTML;
    await finishPageEnter();
    if (token !== pageTransitionToken) return;
    await initCarte(currentUser, { addItemModal: sharedModal });
    return;
  }

  if (routeId === 'activites') {
    pageRoot.innerHTML = ACTIVITIES_VIEW_HTML;
    await finishPageEnter();
    if (token !== pageTransitionToken) return;
    await initActivites(currentUser, { addItemModal: sharedModal });
    return;
  }

  if (routeId === 'restaurants') {
    pageRoot.innerHTML = RESTAURANTS_VIEW_HTML;
    await finishPageEnter();
    if (token !== pageTransitionToken) return;
    await initRestaurants(currentUser, { addItemModal: sharedModal });
    return;
  }

  if (routeId === 'films') {
    pageRoot.innerHTML = FILMS_VIEW_HTML;
    await finishPageEnter();
    if (token !== pageTransitionToken) return;
    await initFilms(currentUser, { addItemModal: sharedModal });
    return;
  }

  if (routeId === 'wishlist') {
    pageRoot.innerHTML = WISHLIST_VIEW_HTML;
    await finishPageEnter();
    if (token !== pageTransitionToken) return;
    await initWishlist(currentUser, { addItemModal: sharedModal });
    return;
  }

  if (routeId === 'voyages') {
    pageRoot.innerHTML = VOYAGES_VIEW_HTML;
    await finishPageEnter();
    if (token !== pageTransitionToken) return;
    await initVoyages(currentUser, { addItemModal: sharedModal });
    return;
  }

  if (routeId === 'parametres') {
    pageRoot.innerHTML = SETTINGS_VIEW_HTML;
    await finishPageEnter();
    if (token !== pageTransitionToken) return;
    initParametres(currentUser, {
      onLogout: async () => {
        await logout();
        showAuthView();
        window.location.hash = '';
      },
      onDataSynced: () => refreshCurrentView(),
      onProfileUpdated: () => refreshCurrentView(),
    });
    return;
  }

  if (routeId === EXPLORER_ROUTE) {
    pageRoot.innerHTML = EXPLORER_VIEW_HTML;
    await finishPageEnter();
    if (token !== pageTransitionToken) return;
    await initExplorer();
    return;
  }

  pageRoot.innerHTML = getPlaceholderViewHtml(routeId);
  await finishPageEnter();
  } finally {
    markBootMountDone();
  }
}

function showAuthView({ reveal = true } = {}) {
  clearAppDataCache();
  resetMapWarmup();
  clearUserProfilesCache();
  clearSpaceSettingsCache();
  clearUserLocationState();
  destroyCurrentView();
  addItemModal?.destroy?.();
  addItemModal = null;
  stopDailyPickReset?.();
  stopDailyPickReset = null;
  stopRouter?.();
  stopRouter = null;
  currentUser = null;
  currentRoute = null;
  sidebarInitialized = false;
  bottomNavInitialized = false;

  document.body.classList.add('auth-page');
  document.body.classList.remove('app-page', 'route-no-fab');
  appView?.classList.add('hidden');

  if (reveal) {
    authView?.classList.remove('hidden');
    document.title = `${APP_NAME}`;
  } else {
    authView?.classList.add('hidden');
  }
}

async function showAppView(user, { reveal = true, awaitData = false } = {}) {
  await initCustomOptions();
  await initUserProfiles(user.uid);
  // Prefetch parallèle : collections + pioches + space settings (activeTravelId).
  const prefetch = prefetchAppData();
  await initSpaceSettings();
  if (awaitData) await prefetch;
  if (!splashActive) void initUserLocationAtLaunch();
  currentUser = user;
  authView?.classList.add('hidden');
  appView?.classList.remove('hidden');

  if (reveal) {
    document.body.classList.add('app-page');
    document.body.classList.remove('auth-page');
  }

  stopDailyPickReset?.();
  stopDailyPickReset = startDailyPickMidnightReset(() => {
    refreshCurrentView();
  });

  renderSidebar(sidebarRoot, { activeId: currentRoute || 'accueil' });

  if (!sidebarInitialized) {
    initSidebar({
      onNavigate: (routeId) => navigate(routeId),
    });
    sidebarInitialized = true;
  } else {
    updateSidebarActive();
  }

  if (!bottomNavInitialized) {
    renderBottomNav(bottomNavRoot, { activeId: currentRoute || 'accueil' });
    initBottomNav({
      onNavigate: (routeId) => navigate(routeId),
      onAdd: () => ensureSharedAddItem(currentUser)?.open?.(),
    });
    bottomNavInitialized = true;
  } else {
    updateBottomNavActive(currentRoute || 'accueil');
  }

  if (!stopRouter) {
    stopRouter = initRouter((routeId) => {
      mountRoute(routeId);
    });
  }
}

async function finishSplashForApp() {
  await Promise.all([bootMountDone, prefetchAppData()]);
  document.body.classList.add('app-page');
  document.body.classList.remove('auth-page');
  await dismissSplash();
  splashActive = false;
  await initUserLocationAtLaunch();
}

async function finishSplashForAuth() {
  showAuthView({ reveal: false });
  await dismissSplash();
  authView?.classList.remove('hidden');
  document.title = `${APP_NAME}`;
  splashActive = false;
}

async function handleInitialAuthState(user) {
  if (user && isAllowedUser(user)) {
    await showAppView(user, { reveal: false });
    await finishSplashForApp();
    return;
  }

  if (user && !isAllowedUser(user)) {
    await logout();
  }

  await finishSplashForAuth();
}

function setupLoginForm() {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('error-message');
  const submitBtn = document.getElementById('submit-btn');

  if (!form) return;

  if (new URLSearchParams(window.location.search).get('error') === 'unauthorized') {
    errorEl.textContent = 'Accès non autorisé.';
    errorEl.classList.remove('hidden');
    window.history.replaceState({}, '', window.location.pathname);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.classList.add('hidden');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      errorEl.textContent = 'Veuillez remplir tous les champs.';
      errorEl.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Connexion…';

    try {
      const { user } = await login(email, password);

      if (!isAllowedUser(user)) {
        await logout();
        errorEl.textContent = 'Accès non autorisé.';
        errorEl.classList.remove('hidden');
        return;
      }

      await showAppView(user, { awaitData: true });
    } catch (err) {
      devError(err.code, err.message);

      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        errorEl.textContent = 'Email ou mot de passe incorrect.';
      } else if (err.code === 'auth/too-many-requests') {
        errorEl.textContent = 'Trop de tentatives. Réessayez plus tard.';
      } else if (err.code === 'auth/invalid-email') {
        errorEl.textContent = 'Adresse email invalide.';
      } else {
        errorEl.textContent = 'Une erreur est survenue. Réessayez.';
      }

      errorEl.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Se connecter';
    }
  });
}

setupLoginForm();
initSplash();

const appVersionEl = document.getElementById('app-version');
if (appVersionEl) {
  appVersionEl.innerHTML = renderVersionBadgeHtml(APP_VERSION);
  appVersionEl.setAttribute('aria-label', `Version ${APP_VERSION}`);
}

onAuthStateChanged(auth, async (user) => {
  if (splashActive) {
    if (splashHandling) return;
    splashHandling = true;
    await handleInitialAuthState(user);
    return;
  }

  if (user && isAllowedUser(user)) {
    await showAppView(user);
    return;
  }

  if (user && !isAllowedUser(user)) {
    await logout();
  }

  showAuthView();
});

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || !currentUser) return;

  const routeId = link.getAttribute('href').replace(/^#\/?/, '');
  const validRoutes = new Set([...NAV_ITEMS.map((item) => item.id), SETTINGS_ITEM.id, EXPLORER_ROUTE]);
  if (!validRoutes.has(routeId)) return;

  event.preventDefault();
  navigate(routeId);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    tabHiddenAt = Date.now();
    return;
  }

  if (!currentUser || splashActive) {
    tabHiddenAt = null;
    return;
  }

  const hiddenDuration = tabHiddenAt ? Date.now() - tabHiddenAt : 0;
  tabHiddenAt = null;
  syncStaleDataIfNeeded({ hiddenDurationMs: hiddenDuration });
});

window.addEventListener('online', () => {
  if (!currentUser || splashActive) return;
  syncStaleDataIfNeeded();
});
