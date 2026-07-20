import { COUPLE_START_DATE, HOME_CATEGORIES, MAP_THEME, getCategoryById, getUserDisplayName } from '../../config.js';
import {
  ensurePrefetch,
  findCachedItemById,
  getNearestMapPlacesFromCache,
  countGeolocatedPlacesFromCache,
  getCachedItems,
  getWeekItemsCountFromCache,
  getCollectionCountFromCache,
  ITEM_COLLECTIONS,
} from '../../data/appDataCache.js';
import { getUserLocationLngLat, onUserLocationChange } from '../../lib/user-location.js';
import { MAP_FALLBACK_CENTER } from '../carte/map-markers.js';
import {
  getDisplayedLatestPick,
} from '../../firebase/dailyPicks.js';
import { initCustomOptions } from '../../lib/custom-types.js';
import { escapeHtml } from '../../lib/escape-html.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';
import { mapPlaceHref } from '../../navigation/router.js';
import { destroyCategoryDetailModals, initCategoryDetailModals } from '../../ui/category-detail-registry.js';
import { initAddItem } from '../../ui/add-item.js';
import { sidebarIcon } from '../../ui/sidebar.js';
import { destroyHomeMapPreview, initHomeMapPreview } from './home-map-preview.js';

const COLLECTION_IDS = ITEM_COLLECTIONS;
const PICK_SCOPES = ['activities', 'restaurants', 'movies'];
const PICK_CATEGORIES = [
  { scope: 'activities', categoryId: 'activities' },
  { scope: 'restaurants', categoryId: 'restaurants' },
  { scope: 'movies', categoryId: 'movies' },
];

const HOME_DETAIL_CATEGORIES = ['activities', 'restaurants', 'movies', 'travels', 'wishlist'];

let currentUserName = '';
let addItemModal = null;
let homeAbort = null;
let stopNearbyLocationListener = null;
let detailModals = {};

function getItemTitle(item, titleKey) {
  return item[titleKey] || item.nom || item.titre || item.destination || 'Sans titre';
}

function getDaysTogether(startDateStr) {
  const start = new Date(startDateStr);
  const now = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function formatStartDate(startDateStr) {
  return new Date(startDateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return 'Bonne nuit';
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function buildHeaderSubtitle(total, weekCount) {
  if (weekCount === 1) return '1 nouvelle idée cette semaine';
  if (weekCount > 1) return `${weekCount} nouvelles idées cette semaine`;
  if (total === 0) return 'Bienvenue dans Our Space';
  return `${total} idée${total > 1 ? 's' : ''} enregistrée${total > 1 ? 's' : ''}`;
}

function getGreetingLabel() {
  const base = getGreeting();
  return currentUserName ? `${base} ${currentUserName}` : base;
}

function initPageHeader(total = null, weekCount = null) {
  const greetingEl = document.getElementById('page-greeting');
  const subEl = document.getElementById('page-header-sub');

  if (greetingEl) greetingEl.textContent = getGreetingLabel();
  if (subEl) {
    subEl.textContent = total === null ? 'Chargement…' : buildHeaderSubtitle(total, weekCount);
  }
}

const SHORTCUT_CATEGORIES = [
  { categoryId: 'activities', getLabel: () => 'On fait quoi aujourd\'hui ?' },
  { categoryId: 'restaurants', getLabel: getMealCtaLabel },
  { categoryId: 'movies', getLabel: getMovieCtaLabel },
];

function getMealCtaLabel() {
  const hour = new Date().getHours();
  if (hour >= 22) return 'On mange quoi demain ?';
  if (hour >= 14) return 'On mange quoi ce soir ?';
  if (hour >= 6) return 'On mange quoi ce midi ?';
  return 'On mange quoi à midi ?';
}

function getMovieCtaLabel() {
  const hour = new Date().getHours();
  if (hour >= 22) return 'On regarde quoi demain ?';
  return 'On regarde quoi ce soir ?';
}

function getPickListEntries() {
  const entries = [];

  for (const { scope, categoryId } of PICK_CATEGORIES) {
    const cat = getCategoryById(categoryId);
    if (!cat) continue;

    const displayed = getDisplayedLatestPick(scope);
    if (!displayed?.id) continue;

    const item = findCachedItemById(categoryId, displayed.id);
    if (item) {
      entries.push({ categoryId, category: cat, item });
    }
  }

  return entries;
}

function buildPicksSubtitle(count) {
  if (count === 0) return 'Aucune pioche enregistrée';
  if (count === 1) return '1 pioche';
  return `${count} pioches`;
}

function countTodoItems(categoryId) {
  return (getCachedItems(categoryId) ?? []).filter((item) => !item.done).length;
}

function buildShortcutsSubtitle() {
  const total = SHORTCUT_CATEGORIES.reduce((sum, { categoryId }) => sum + countTodoItems(categoryId), 0);
  if (total === 0) return 'Ajoutez vos premières idées';
  if (total === 1) return '1 idée à explorer';
  return `${total} idées à explorer`;
}

function renderTodaySkeleton() {
  return Array.from({ length: 2 }, () => `
    <li class="home-pick-item home-pick-item--skeleton" aria-hidden="true">
      <div class="skel-block skel-block--pick-icon skel-shimmer"></div>
      <div class="home-pick-copy">
        <div class="skel-block skel-block--pick-cat skel-shimmer"></div>
        <div class="skel-block skel-block--pick-title skel-shimmer"></div>
      </div>
      <div class="skel-block skel-block--pick-detail skel-shimmer"></div>
    </li>
  `).join('');
}

function renderNearbySkeleton() {
  return `
    <div class="home-nearby-map skel-block skel-shimmer" aria-hidden="true"></div>
    <div class="home-nearby-places" aria-hidden="true">
      ${Array.from({ length: 3 }, () => `
        <div class="home-nearby-place home-nearby-place--skeleton">
          <div class="skel-block skel-block--nearby-icon skel-shimmer"></div>
          <div class="home-nearby-place-copy">
            <div class="skel-block skel-block--nearby-title skel-shimmer"></div>
            <div class="skel-block skel-block--nearby-loc skel-shimmer"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderPickItem({ categoryId, category, item }, index) {
  const title = getItemTitle(item, category.titleKey);
  const shortLabel = category.label.replace(' & Séries', '');

  return `
    <li
      class="home-pick-item"
      data-theme="${category.theme}"
      style="animation-delay: ${index * 40}ms"
    >
      <span class="home-pick-icon" aria-hidden="true">${sidebarIcon(category.icon)}</span>
      <div class="home-pick-copy">
        <span class="home-pick-cat">${escapeHtml(shortLabel)}</span>
        <span class="home-pick-title">${escapeHtml(title)}</span>
      </div>
      <button
        type="button"
        class="home-pick-detail"
        data-category-id="${categoryId}"
        data-item-id="${escapeHtml(item.id)}"
        aria-label="Voir le détail de ${escapeHtml(title)}"
      >
        Détail
      </button>
    </li>
  `;
}

function renderTodaySection() {
  const inner = document.getElementById('home-today-inner');
  const subEl = document.getElementById('home-today-sub');
  if (!inner) return;

  if (inner.classList.contains('is-loading')) {
    inner.innerHTML = `<ul class="home-picks-list">${renderTodaySkeleton()}</ul>`;
    return;
  }

  const entries = getPickListEntries();

  if (subEl) {
    subEl.textContent = buildPicksSubtitle(entries.length);
  }

  if (!entries.length) {
    inner.innerHTML = `
      <div class="home-picks-empty">
        <p>Aucune pioche pour l'instant</p>
        <span class="home-picks-empty-hint">Tirez le dé depuis Activités, Restaurants ou Films</span>
        <div class="home-picks-empty-links">
          <a href="#activites" class="home-picks-empty-link" data-theme="cyan">Activités</a>
          <a href="#restaurants" class="home-picks-empty-link" data-theme="rose">Restaurants</a>
          <a href="#films" class="home-picks-empty-link" data-theme="violet">Films</a>
        </div>
      </div>
    `;
    return;
  }

  inner.innerHTML = `
    <ul class="home-picks-list" role="list">
      ${entries.map((entry, index) => renderPickItem(entry, index)).join('')}
    </ul>
  `;
}

function getNearbyOriginLngLat() {
  return getUserLocationLngLat() || MAP_FALLBACK_CENTER;
}

function renderNearbyDistanceBadge(distanceLabel) {
  return `
    <span class="act-list-status home-nearby-place-distance-badge">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
      </svg>
      ${escapeHtml(distanceLabel)}
    </span>
  `;
}

function buildNearbySubtitle(totalPlaces, nearestCount) {
  if (totalPlaces === 0) return 'Aucun lieu enregistré';
  if (nearestCount === 0) {
    return totalPlaces === 1 ? '1 lieu enregistré' : `${totalPlaces} lieux enregistrés`;
  }

  const proximityHint = getUserLocationLngLat() ? 'depuis vous' : 'à vol d\'oiseau';
  if (totalPlaces === 1) return `1 lieu · le plus proche ${proximityHint}`;
  return `${totalPlaces} lieux · ${nearestCount} plus proches ${proximityHint}`;
}

function renderNearbyMapPreview(totalPlaces) {
  const countLabel = totalPlaces === 1 ? '1 lieu sur la carte' : `${totalPlaces} lieux sur la carte`;

  return `
    <a href="#carte" class="home-nearby-map-link" aria-label="Ouvrir la carte interactive">
      <div class="home-nearby-map-preview" data-theme="${MAP_THEME}">
        <span class="home-nearby-map-preview-fallback" aria-hidden="true"></span>
        <div class="home-nearby-map-preview-canvas" id="home-nearby-map-canvas" aria-hidden="true"></div>
        <span class="home-nearby-map-preview-grid" aria-hidden="true"></span>
        <span class="home-nearby-map-preview-copy">
          <span class="home-nearby-map-preview-title">Carte interactive</span>
          <span class="home-nearby-map-preview-text">${countLabel}</span>
        </span>
      </div>
    </a>
  `;
}

function renderNearbySection() {
  const inner = document.getElementById('home-nearby-inner');
  const subEl = document.getElementById('home-nearby-sub');
  if (!inner) return;

  destroyHomeMapPreview();

  if (inner.classList.contains('is-loading')) {
    inner.innerHTML = renderNearbySkeleton();
    return;
  }

  const totalPlaces = countGeolocatedPlacesFromCache();
  const places = getNearestMapPlacesFromCache(4, getNearbyOriginLngLat());

  if (subEl) {
    subEl.textContent = buildNearbySubtitle(totalPlaces, places.length);
  }

  const mapPreview = totalPlaces > 0
    ? renderNearbyMapPreview(totalPlaces)
    : `
      <div class="home-nearby-map">
        <div class="act-map-placeholder home-nearby-map-placeholder">
          <span class="act-map-placeholder-icon" aria-hidden="true">
            ${renderNavIcon('map', { strokeWidth: 1.75, width: 24, height: 24 })}
          </span>
          <p class="act-map-placeholder-title">Aucun lieu géolocalisé</p>
          <p class="act-map-placeholder-text">Ajoutez un lieu à vos activités, restaurants ou voyages pour les voir sur la carte.</p>
        </div>
      </div>
    `;

  if (!places.length) {
    inner.innerHTML = mapPreview;
    if (totalPlaces > 0) initHomeMapPreview();
    else destroyHomeMapPreview();
    return;
  }

  const placesHtml = places.map(({ categoryId, item, title, location, distanceLabel }) => {
    const cat = getCategoryById(categoryId);
    const theme = cat?.theme || 'base';
    const tag = cat?.label?.replace(' & Séries', '') || 'Lieu';

    return `
      <a
        href="${mapPlaceHref(categoryId, item.id)}"
        class="home-nearby-place"
        data-theme="${theme}"
        aria-label="Voir ${escapeHtml(title)} sur la carte"
      >
        <span class="home-nearby-place-icon" aria-hidden="true">${sidebarIcon(cat?.icon || 'activity')}</span>
        <span class="home-nearby-place-copy">
          <span class="home-nearby-place-tag">${escapeHtml(tag)}</span>
          <span class="home-nearby-place-title">${escapeHtml(title)}</span>
          ${location ? `<span class="home-nearby-place-loc">${escapeHtml(location)}</span>` : ''}
        </span>
        ${renderNearbyDistanceBadge(distanceLabel)}
        <span class="home-nearby-place-arrow" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </span>
      </a>
    `;
  }).join('');

  inner.innerHTML = `
    <div class="home-nearby-map">
      ${mapPreview}
    </div>
    <div class="home-nearby-places" role="list">
      ${placesHtml}
    </div>
  `;

  if (totalPlaces > 0) initHomeMapPreview();
  else destroyHomeMapPreview();
}

function renderShortcutsSection() {
  const shortcutsEl = document.getElementById('home-shortcuts');
  const subEl = document.getElementById('home-shortcuts-sub');
  if (!shortcutsEl) return;

  if (subEl) {
    subEl.textContent = buildShortcutsSubtitle();
  }

  shortcutsEl.innerHTML = SHORTCUT_CATEGORIES.map(({ categoryId, getLabel }) => {
    const cat = getCategoryById(categoryId);
    if (!cat) return '';

    const todoCount = countTodoItems(categoryId);
    const countLabel = todoCount === 1
      ? '1 idée'
      : todoCount > 1
        ? `${todoCount} idées`
        : 'Aucune idée';

    return `
      <a href="${cat.href}" class="home-shortcut" data-theme="${cat.theme}">
        <span class="home-shortcut-icon" aria-hidden="true">${sidebarIcon(cat.icon)}</span>
        <span class="home-shortcut-copy">
          <span class="home-shortcut-label">${escapeHtml(getLabel())}</span>
          <span class="home-shortcut-meta">${escapeHtml(countLabel)}</span>
        </span>
        <span class="home-shortcut-arrow" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </span>
      </a>
    `;
  }).join('');
}

function renderExplorerMapCard() {
  const totalPlaces = countGeolocatedPlacesFromCache();

  return `
    <a href="#carte" class="cat-card cat-card--stat" data-theme="${MAP_THEME}" aria-label="Ouvrir la carte interactive">
      <div class="cat-card-inner">
        <span class="cat-card-glow" aria-hidden="true"></span>
        <span class="cat-card-icon" aria-hidden="true">${sidebarIcon('map')}</span>
        <span class="cat-card-value">${totalPlaces}</span>
        <span class="cat-card-label">Carte interactive</span>
      </div>
    </a>
  `;
}

function renderExplorerSection() {
  const explorerEl = document.getElementById('home-explorer');
  if (!explorerEl) return;

  explorerEl.innerHTML = renderExplorerMapCard() + HOME_CATEGORIES.map((cat) => {
    const count = getCollectionCountFromCache(cat.id);
    return `
      <a href="${cat.href}" class="cat-card cat-card--stat" data-theme="${cat.theme}">
        <div class="cat-card-inner">
          <span class="cat-card-glow" aria-hidden="true"></span>
          <span class="cat-card-icon" aria-hidden="true">${sidebarIcon(cat.icon)}</span>
          <span class="cat-card-value">${count}</span>
          <span class="cat-card-label">${escapeHtml(cat.label)}</span>
        </div>
      </a>
    `;
  }).join('');
}

function initDetailModals() {
  destroyCategoryDetailModals(detailModals);
  detailModals = initCategoryDetailModals(HOME_DETAIL_CATEGORIES, {
    onChanged: () => loadHomeData(),
  });
}

function destroyDetailModals() {
  destroyCategoryDetailModals(detailModals);
  detailModals = {};
}

function openItemDetail(categoryId, itemId) {
  const item = findCachedItemById(categoryId, itemId);
  const modal = detailModals[categoryId];
  if (!item || !modal) return;
  modal.open(item);
}

function onHomeClick(event) {
  const detailBtn = event.target.closest('.home-pick-detail[data-item-id]');
  if (!detailBtn) return;
  event.preventDefault();
  openItemDetail(detailBtn.dataset.categoryId, detailBtn.dataset.itemId);
}

export function destroyHomePage() {
  homeAbort?.abort();
  homeAbort = null;
  stopNearbyLocationListener?.();
  stopNearbyLocationListener = null;
  destroyHomeMapPreview();
  destroyDetailModals();
}

export async function initHomePage(user, { addItemModal: sharedModal } = {}) {
  destroyHomePage();
  await initCustomOptions();
  homeAbort = new AbortController();
  const { signal } = homeAbort;

  currentUserName = getUserDisplayName(user);
  addItemModal = sharedModal ?? initAddItem({ user, onAdded: () => loadHomeData() });
  initDetailModals();
  initPageHeader();
  renderDaysCounter();

  const todayInner = document.getElementById('home-today-inner');
  const nearbyInner = document.getElementById('home-nearby-inner');

  if (todayInner && !todayInner.innerHTML) {
    todayInner.innerHTML = `<ul class="home-picks-list">${renderTodaySkeleton()}</ul>`;
  }
  if (nearbyInner && !nearbyInner.innerHTML) nearbyInner.innerHTML = renderNearbySkeleton();

  document.addEventListener('click', onHomeClick, { signal });
  stopNearbyLocationListener = onUserLocationChange(() => {
    const nearbyInner = document.getElementById('home-nearby-inner');
    if (nearbyInner && !nearbyInner.classList.contains('is-loading')) {
      renderNearbySection();
    }
  });
  loadHomeData();
}

function renderDaysCounter() {
  const days = getDaysTogether(COUPLE_START_DATE);
  const daysEl = document.getElementById('days-count');
  const sinceEl = document.getElementById('days-since');
  const labelEl = document.getElementById('days-label');

  if (daysEl) {
    animateCount(daysEl, days);
  }
  if (sinceEl) {
    sinceEl.textContent = formatStartDate(COUPLE_START_DATE);
  }
  if (labelEl) {
    const unitEl = labelEl.querySelector('.days-stat-label-unit');
    if (unitEl) unitEl.textContent = days <= 1 ? 'jour' : 'jours';
  }
}

function animateCount(el, target) {
  const duration = 900;
  const start = performance.now();
  const from = 0;

  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    el.textContent = Math.round(from + (target - from) * eased);
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

async function loadHomeData() {
  await initCustomOptions();
  await ensurePrefetch();

  const total = COLLECTION_IDS.reduce((sum, id) => sum + getCollectionCountFromCache(id), 0);
  const weekCount = getWeekItemsCountFromCache(COLLECTION_IDS);
  initPageHeader(total, weekCount);

  const todayInner = document.getElementById('home-today-inner');
  const nearbyInner = document.getElementById('home-nearby-inner');

  todayInner?.classList.remove('is-loading');
  nearbyInner?.classList.remove('is-loading');

  renderTodaySection();
  renderNearbySection();
  renderShortcutsSection();
  renderExplorerSection();
}

export function refreshHomePage() {
  return loadHomeData();
}
