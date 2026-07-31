/**
 * Preview DA — auth Firebase, données réelles, transitions comme app.js.
 */
import { auth } from './firebase/config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { login, logout } from './auth/login.js';
import { isAllowedUser } from './auth/session.js';
import { initCustomOptions } from './lib/custom-types.js';
import { waitForTransition, nextFrame } from './lib/transitions.js';
import { prefetchAppData, clearAppDataCache } from './data/appDataCache.js';
import { initUserProfiles, clearUserProfilesCache } from './lib/user-profile.js';
import { initSpaceSettings, clearSpaceSettingsCache } from './lib/space-settings.js';
import { initUserLocationAtLaunch, clearUserLocationState } from './lib/user-location.js';
import { releaseStalePageScrollLock } from './lib/scroll-lock.js';
import { initAppTheme } from './lib/app-theme.js';
import { resetMapWarmup } from './pages/carte/map-warmup.js';
import { renderBottomNav, initBottomNav, updateBottomNavActive } from './bottom-nav.js';
import { initAddItem } from './ui/add-item.js';
import {
  renderPageHeader,
  beginPageHeaderSwap,
  commitPageHeaderForRoute,
  revealPageHeader,
  setPageHeaderForRoute,
} from './ui/page-header.js';
import { initRouter, EXPLORER_ROUTE, getRouteFromHash, navigate } from './navigation/router.js';
import { getPlaceholderViewHtml } from './navigation/placeholder.js';
import {
  init as initAccueil,
  destroy as destroyAccueil,
  refresh as refreshAccueil,
  HOME_VIEW_HTML,
} from './pages/accueil/index.js';
import {
  init as initCarte,
  destroy as destroyCarte,
  MAP_VIEW_HTML,
} from './pages/carte/index.js';
import {
  init as initParametres,
  destroy as destroyParametres,
  SETTINGS_VIEW_HTML,
} from './pages/parametres/index.js';
import {
  init as initExplorer,
  destroy as destroyExplorer,
  EXPLORER_VIEW_HTML,
} from './pages/explorer/index.js';

const PAGE_TRANSITION_MS = 220;
const PREVIEW_LOGIN_EMAIL = 'bastosjamet@gmail.com';

let currentUser = null;
let currentRoute = null;
let addItemModal = null;
let stopRouter = null;
let pageTransitionToken = 0;
let bottomNavInitialized = false;

const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const pageRoot = document.getElementById('page-root');
const bottomNavRoot = document.getElementById('bottom-nav-root');

function destroyCurrentView() {
  destroyAccueil();
  destroyCarte();
  destroyParametres();
  destroyExplorer();
}

function refreshCurrentView() {
  if (currentRoute === 'accueil') return refreshAccueil();
  return undefined;
}

function ensureSharedAddItem(user) {
  if (addItemModal) return addItemModal;

  addItemModal = initAddItem({
    user,
    onAdded: () => refreshCurrentView(),
    onUpdated: () => refreshCurrentView(),
  });

  return addItemModal;
}

function showAuthView() {
  clearAppDataCache();
  resetMapWarmup();
  clearUserProfilesCache();
  clearSpaceSettingsCache();
  clearUserLocationState();
  destroyCurrentView();
  addItemModal?.destroy?.();
  addItemModal = null;
  stopRouter?.();
  stopRouter = null;
  currentUser = null;
  currentRoute = null;
  bottomNavInitialized = false;

  document.body.classList.add('auth-page');
  document.body.classList.remove('app-page', 'route-no-fab');
  document.body.removeAttribute('data-app-theme');
  appView?.classList.add('hidden');
  authView?.classList.remove('hidden');
}

async function showAppView(user) {
  await initCustomOptions();
  await initUserProfiles(user.uid);
  await Promise.all([prefetchAppData(), initSpaceSettings()]);
  initAppTheme();
  void initUserLocationAtLaunch();

  currentUser = user;
  authView?.classList.add('hidden');
  appView?.classList.remove('hidden');
  document.body.classList.add('app-page');
  document.body.classList.remove('auth-page');

  renderPageHeader(document.getElementById('page-header-root'));

  if (!bottomNavInitialized) {
    renderBottomNav(bottomNavRoot, { activeId: getRouteFromHash() });
    initBottomNav({
      onNavigate: (routeId) => navigate(routeId),
      onAdd: () => ensureSharedAddItem(currentUser)?.open?.(),
    });
    bottomNavInitialized = true;
  } else {
    updateBottomNavActive(getRouteFromHash());
  }

  if (!stopRouter) {
    stopRouter = initRouter((routeId) => {
      void mountRoute(routeId);
    });
  }
}

async function mountRoute(routeId) {
  if (!currentUser || !pageRoot) return;

  releaseStalePageScrollLock();

  const token = ++pageTransitionToken;
  const hasContent = pageRoot.innerHTML.trim().length > 0;
  let headerSwapToken = null;

  updateBottomNavActive(routeId);
  document.body.classList.toggle('route-no-fab', routeId === 'parametres' || routeId === 'carte');

  if (hasContent) {
    pageRoot.classList.add('is-page-leaving');
    headerSwapToken = beginPageHeaderSwap();
    await waitForTransition(pageRoot, PAGE_TRANSITION_MS);
    if (token !== pageTransitionToken) return;
    commitPageHeaderForRoute(routeId);
  } else {
    void setPageHeaderForRoute(routeId, { animate: false });
  }

  destroyCurrentView();
  currentRoute = routeId;

  const sharedModal = ensureSharedAddItem(currentUser);

  const finishPageEnter = async () => {
    if (!hasContent) {
      pageRoot.classList.remove('is-page-leaving', 'is-page-entering');
      return;
    }
    pageRoot.classList.remove('is-page-leaving');
    pageRoot.classList.add('is-page-entering');
    await nextFrame();
    if (token !== pageTransitionToken) return;
    pageRoot.classList.remove('is-page-entering');
    revealPageHeader(headerSwapToken);
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
}

function setupLoginForm() {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('error-message');
  const submitBtn = document.getElementById('submit-btn');
  const emailInput = document.getElementById('email');

  if (emailInput && !emailInput.value) {
    emailInput.value = PREVIEW_LOGIN_EMAIL;
  }

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl?.classList.add('hidden');

    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;

    if (!email || !password) {
      if (errorEl) {
        errorEl.textContent = 'Veuillez remplir tous les champs.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Connexion…';
    }

    try {
      await login(email, password);
    } catch {
      if (errorEl) {
        errorEl.textContent = 'Email ou mot de passe incorrect.';
        errorEl.classList.remove('hidden');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Se connecter';
      }
    }
  });
}

async function bootstrapPreview() {
  if (!window.location.hash || window.location.hash === '#') {
    window.location.replace(`${window.location.pathname}${window.location.search}#accueil`);
  }

  setupLoginForm();

  onAuthStateChanged(auth, async (user) => {
    if (user && isAllowedUser(user)) {
      await showAppView(user);
      return;
    }

    if (user && !isAllowedUser(user)) {
      await logout();
    }

    showAuthView();
  });
}

bootstrapPreview();
