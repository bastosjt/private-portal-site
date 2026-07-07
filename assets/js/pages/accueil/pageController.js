import { COUPLE_START_DATE, HOME_CATEGORIES, getCategoryById, getUserDisplayName } from '../../config.js';
import {
  fetchRecentItems,
  fetchCollectionCount,
  fetchWeekItemsCount,
  fetchAllItems,
} from '../../firebase/firestore.js';
import { sidebarIcon } from '../../ui/sidebar.js';
import { initAddItem } from '../../ui/add-item.js';
import { loadTodayPicks, getLatestPickId } from '../../firebase/dailyPicks.js';

const COLLECTION_IDS = HOME_CATEGORIES.map((cat) => cat.id);
const DAILY_PICK_SCOPES = {
  activities: 'activities',
  restaurants: 'restaurants',
};
let currentUserName = '';
let addItemModal = null;
let homeAbort = null;

function onAddCategoryClick(event) {
  const trigger = event.target.closest('[data-add-category]');
  if (!trigger || !addItemModal) return;
  event.preventDefault();
  addItemModal.open(trigger.dataset.addCategory);
}

function getItemTitle(item, titleKey) {
  return item[titleKey] || item.nom || item.titre || item.destination || 'Sans titre';
}

function renderRecentItem(item, titleKey) {
  const title = getItemTitle(item, titleKey);
  return `
    <li>
      <span class="cat-recent-item">
        <span class="cat-recent-dot" aria-hidden="true"></span>
        <span class="cat-recent-title">${escapeHtml(title)}</span>
      </span>
    </li>
  `;
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderStatsSkeleton() {
  return Array.from({ length: HOME_CATEGORIES.length }, () => `
    <div class="skel-stat" aria-hidden="true">
      <div class="skel-block skel-block--icon skel-shimmer"></div>
      <div class="skel-block skel-block--value skel-shimmer"></div>
      <div class="skel-block skel-block--label skel-shimmer"></div>
    </div>
  `).join('');
}

function renderRecentSkeleton() {
  return Array.from({ length: HOME_CATEGORIES.length }, () => `
    <div class="skel-panel" aria-hidden="true">
      <div class="skel-panel-head">
        <div class="skel-block skel-block--panel-icon skel-shimmer"></div>
        <div class="skel-panel-head-text">
          <div class="skel-block skel-block--panel-title skel-shimmer"></div>
          <div class="skel-block skel-block--panel-meta skel-shimmer"></div>
        </div>
      </div>
      <div class="skel-block skel-block--line skel-shimmer"></div>
      <div class="skel-block skel-block--line skel-shimmer"></div>
      <div class="skel-block skel-block--line skel-block--line-short skel-shimmer"></div>
    </div>
  `).join('');
}

export function destroyHomePage() {
  homeAbort?.abort();
  homeAbort = null;
}

export function initHomePage(user, { addItemModal: sharedModal } = {}) {
  destroyHomePage();
  homeAbort = new AbortController();
  const { signal } = homeAbort;

  currentUserName = getUserDisplayName(user);
  addItemModal = sharedModal ?? initAddItem({ user, onAdded: () => loadHomeData() });
  initPageHeader();
  renderDaysCounter();
  document.addEventListener('click', onAddCategoryClick, { signal });
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
    labelEl.textContent = days <= 1 ? 'jour ensemble' : 'jours ensemble';
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

function getMealCtaLabel() {
  const hour = new Date().getHours();
  if (hour >= 22) return 'On mange quoi demain ?';
  if (hour >= 14) return 'On mange quoi ce soir ?';
  if (hour >= 6) return 'On mange quoi ce midi ?';
  return 'On mange quoi à midi ?';
}

function renderDailyPick(cat, pickedItem) {
  if (!pickedItem) return '';

  const title = getItemTitle(pickedItem, cat.titleKey);
  return `
    <a href="${cat.href}" class="pick-snippet" data-theme="${cat.theme}">
      <span class="pick-snippet-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2"/>
          <path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/>
        </svg>
      </span>
      <span class="pick-snippet-copy">
        <span class="pick-snippet-label">Pioche du jour</span>
        <span class="pick-snippet-name">${escapeHtml(title)}</span>
      </span>
    </a>
  `;
}

function renderHomeHub() {
  const hubEl = document.getElementById('home-hub');
  if (!hubEl) return;

  const activitiesCat = getCategoryById('activities');
  const restaurantsCat = getCategoryById('restaurants');
  const activitiesTheme = activitiesCat?.theme || 'cyan';
  const restaurantsTheme = restaurantsCat?.theme || 'rose';
  const restaurantsHref = restaurantsCat?.href || '#restaurants';

  hubEl.innerHTML = `
    <a href="#activites" class="home-hub-cta" data-theme="${activitiesTheme}">
      <span class="home-hub-cta-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2"/>
          <path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/>
        </svg>
      </span>
      <span class="home-hub-cta-text">On fait quoi aujourd'hui ?</span>
    </a>
    <a href="${restaurantsHref}" class="home-hub-cta" data-theme="${restaurantsTheme}">
      <span class="home-hub-cta-icon" aria-hidden="true">${sidebarIcon('restaurant')}</span>
      <span class="home-hub-cta-text">${escapeHtml(getMealCtaLabel())}</span>
    </a>
  `;
}

async function loadHomeData() {
  const statsEl = document.getElementById('stats-grid');
  const recentEl = document.getElementById('recent-sections');

  if (statsEl) {
    statsEl.classList.add('is-loading');
    statsEl.innerHTML = renderStatsSkeleton();
  }
  if (recentEl) {
    recentEl.classList.add('is-loading');
    recentEl.innerHTML = renderRecentSkeleton();
  }

  const [, counts, recents, weekCount] = await Promise.all([
    Promise.all(Object.values(DAILY_PICK_SCOPES).map((scope) => loadTodayPicks(scope))),
    Promise.all(
      HOME_CATEGORIES.map(async (cat) => ({
        ...cat,
        count: await fetchCollectionCount(cat.id),
      })),
    ),
    Promise.all(
      HOME_CATEGORIES.map(async (cat) => ({
        ...cat,
        items: await fetchRecentItems(cat.id, 4),
      })),
    ),
    fetchWeekItemsCount(COLLECTION_IDS),
  ]);

  const pickedByCategory = {};
  await Promise.all(
    Object.entries(DAILY_PICK_SCOPES).map(async ([categoryId, scope]) => {
      const pickId = getLatestPickId(scope);
      if (!pickId) return;

      const items = await fetchAllItems(categoryId);
      pickedByCategory[categoryId] = items.find((item) => item.id === pickId) ?? null;
    }),
  );
  renderHomeHub();

  const total = counts.reduce((sum, cat) => sum + cat.count, 0);
  initPageHeader(total, weekCount);

  const totalEl = document.getElementById('stats-total');
  if (totalEl) totalEl.textContent = total;

  if (statsEl) {
    statsEl.innerHTML = counts.map((cat) => `
      <a href="${cat.href}" class="cat-card cat-card--stat" data-theme="${cat.theme}">
        <div class="cat-card-inner">
          <span class="cat-card-glow" aria-hidden="true"></span>
          <span class="cat-card-icon">${sidebarIcon(cat.icon)}</span>
          <span class="cat-card-value">${cat.count}</span>
          <span class="cat-card-label">${cat.label}</span>
        </div>
      </a>
    `).join('');
    statsEl.classList.remove('is-loading');
  }

  if (recentEl) {
    const countMap = Object.fromEntries(counts.map((c) => [c.id, c.count]));

    recentEl.innerHTML = recents.map((cat, index) => {
      const count = countMap[cat.id] ?? 0;
      const itemsHtml = cat.items.length
        ? `<ul class="cat-recent-list">${cat.items.map((item) => renderRecentItem(item, cat.titleKey)).join('')}</ul>`
        : `<div class="cat-recent-empty">
            <span class="cat-recent-empty-icon">${sidebarIcon(cat.icon)}</span>
            <p>Rien pour l'instant</p>
            <button type="button" class="cat-empty-cta" data-add-category="${cat.id}">
              ${escapeHtml(cat.addLabel)}
            </button>
          </div>`;

      return `
        <section class="cat-panel${cat.items.length ? '' : ' cat-panel--empty'}" data-theme="${cat.theme}" style="animation-delay: ${index * 60}ms">
          <div class="cat-panel-inner">
            ${cat.items.length ? `<a href="${cat.href}" class="cat-panel-hit" aria-label="Voir ${escapeHtml(cat.label)}"></a>` : ''}
            <span class="cat-panel-accent" aria-hidden="true"></span>
            <div class="cat-panel-head">
              <div class="cat-panel-title">
                <span class="cat-panel-icon">${sidebarIcon(cat.icon)}</span>
                <div>
                  <h3>${cat.label}</h3>
                  <p>${count} idée${count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <span class="cat-panel-link">Voir tout</span>
            </div>
            ${itemsHtml}
            ${renderDailyPick(cat, pickedByCategory[cat.id])}
          </div>
        </section>
      `;
    }).join('');
    recentEl.classList.remove('is-loading');
  }
}

export function refreshHomePage() {
  return loadHomeData();
}
