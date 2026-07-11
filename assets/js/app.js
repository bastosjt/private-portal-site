import { auth } from './firebase/config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { login, logout } from './auth/login.js';
import { isAllowedUser, warnIfDemoUidMismatch } from './auth/session.js?v=2';
import { resolveWorkspaceId, setActiveWorkspace } from './auth/workspace.js?v=1';
import { resetDailyPicksCache, startDailyPickMidnightReset } from './firebase/dailyPicks.js';
import { initCustomOptions, resetCustomOptionsState } from './lib/custom-types.js';
import { NAV_ITEMS, APP_NAME } from './config.js';
import { initRouter, navigate } from './navigation/router.js';
import { renderSidebar, initSidebar, updateSidebarActive } from './ui/sidebar.js';
import { initAddItem } from './ui/add-item.js';
import { waitForTransition, nextFrame } from './lib/transitions.js';
import { init as initAccueil, destroy as destroyAccueil, refresh as refreshAccueil, HOME_VIEW_HTML } from './pages/accueil/index.js';
import { init as initActivites, destroy as destroyActivites, refresh as refreshActivites, ACTIVITIES_VIEW_HTML } from './pages/activites/index.js';
import { init as initRestaurants, destroy as destroyRestaurants, refresh as refreshRestaurants, RESTAURANTS_VIEW_HTML } from './pages/restaurants/index.js';
import { init as initFilms, destroy as destroyFilms, refresh as refreshFilms, FILMS_VIEW_HTML } from './pages/films/index.js';
import { init as initWishlist, destroy as destroyWishlist, refresh as refreshWishlist, WISHLIST_VIEW_HTML } from './pages/wishlist/index.js';
import { init as initVoyages, destroy as destroyVoyages, refresh as refreshVoyages, VOYAGES_VIEW_HTML } from './pages/voyages/index.js';
import { getPlaceholderViewHtml } from './navigation/placeholder.js';

const PAGE_TITLES = {
  accueil: 'Accueil',
  activites: 'Activités',
  restaurants: 'Restaurants',
  films: 'Films & Séries',
  voyages: 'Voyages',
  wishlist: 'Wishlist',
};

let currentUser = null;
let currentRoute = null;
let addItemModal = null;
let stopRouter = null;
let sidebarInitialized = false;
let pageTransitionToken = 0;
let stopDailyPickReset = null;

const PAGE_TRANSITION_MS = 300;

const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const pageRoot = document.getElementById('page-root');
const sidebarRoot = document.getElementById('sidebar-root');

function setPageTitle(routeId) {
  const label = PAGE_TITLES[routeId] || APP_NAME;
  document.title = `${label} — ${APP_NAME}`;
}

function destroyCurrentView() {
  destroyAccueil();
  destroyActivites();
  destroyRestaurants();
  destroyFilms();
  destroyWishlist();
  destroyVoyages();
}

function refreshCurrentView() {
  if (currentRoute === 'accueil') return refreshAccueil();
  if (currentRoute === 'activites') return refreshActivites();
  if (currentRoute === 'restaurants') return refreshRestaurants();
  if (currentRoute === 'films') return refreshFilms();
  if (currentRoute === 'wishlist') return refreshWishlist();
  if (currentRoute === 'voyages') return refreshVoyages();
  return undefined;
}

function activateWorkspace(user) {
  const workspaceId = resolveWorkspaceId(user);
  setActiveWorkspace(workspaceId);
  resetDailyPicksCache();
  resetCustomOptionsState();
  addItemModal = null;
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

async function mountRoute(routeId) {
  if (!currentUser || !pageRoot) return;

  const token = ++pageTransitionToken;
  const hasContent = pageRoot.innerHTML.trim().length > 0;

  if (hasContent) {
    pageRoot.classList.add('is-page-leaving');
    await waitForTransition(pageRoot, PAGE_TRANSITION_MS);
    if (token !== pageTransitionToken) return;
  }

  destroyCurrentView();
  currentRoute = routeId;
  setPageTitle(routeId);
  updateSidebarActive(routeId);

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

  pageRoot.innerHTML = getPlaceholderViewHtml(routeId);
  await finishPageEnter();
}

function showAuthView() {
  destroyCurrentView();
  stopDailyPickReset?.();
  stopDailyPickReset = null;
  stopRouter?.();
  stopRouter = null;
  currentUser = null;
  currentRoute = null;
  sidebarInitialized = false;
  addItemModal = null;
  setActiveWorkspace(null);
  resetDailyPicksCache();
  resetCustomOptionsState();

  document.body.classList.add('auth-page');
  document.body.classList.remove('app-page');
  authView?.classList.remove('hidden');
  appView?.classList.add('hidden');
  document.title = `${APP_NAME}`;
}

async function showAppView(user) {
  activateWorkspace(user);
  try {
    await initCustomOptions();
  } catch (err) {
    console.warn('initCustomOptions:', err.message);
  }
  currentUser = user;
  authView?.classList.add('hidden');
  appView?.classList.remove('hidden');

  stopDailyPickReset?.();
  stopDailyPickReset = startDailyPickMidnightReset(() => {
    refreshCurrentView();
  });

  renderSidebar(sidebarRoot, { user, activeId: currentRoute || 'accueil', workspace: resolveWorkspaceId(user) });

  if (!sidebarInitialized) {
    initSidebar({
      onNavigate: (routeId) => navigate(routeId),
      onLogout: async () => {
        await logout();
        showAuthView();
        window.location.hash = '';
      },
    });
    sidebarInitialized = true;
  } else {
    updateSidebarActive();
  }

  if (!stopRouter) {
    stopRouter = initRouter((routeId) => {
      mountRoute(routeId);
    });
  }
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
        console.warn('[Our Space] Connexion refusée — UID:', user.uid, '| email:', user.email);
        errorEl.textContent = 'Accès non autorisé.';
        errorEl.classList.remove('hidden');
        return;
      }

      warnIfDemoUidMismatch(user);
      await showAppView(user);
    } catch (err) {
      console.error(err.code, err.message);

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

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || !currentUser) return;

  const routeId = link.getAttribute('href').replace(/^#\/?/, '');
  if (!NAV_ITEMS.some((item) => item.id === routeId)) return;

  event.preventDefault();
  navigate(routeId);
});
