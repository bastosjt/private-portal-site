import { getCategoryById, getUserDisplayName } from '../config.js';
import { formatPrice, formatOptionLabel } from '../utils/format.js';
import { fetchAllItems } from '../api/firestore.js';
import { sidebarIcon } from '../components/sidebar.js';
import { renderRestaurantTypeIcon } from '../config/restaurant-type-icons.js';
import { initAddItem } from '../components/add-item.js';
import { initRestaurantDetail } from '../components/restaurant-detail.js';
import { initListFilters } from '../components/list-filters.js';
import { getCustomOptions } from '../services/custom-options.js';
import {
  addTodayPick,
  canPickToday,
  getLatestPickId,
  getPickQuotaLabel,
  getRemainingPicks,
  getTodayPickIds,
  loadTodayPicks,
  resetTodayPicks,
} from '../services/daily-picks.js';

const CATEGORY = getCategoryById('restaurants');
const COLLECTION = 'restaurants';
const PICK_SCOPE = 'restaurants';

const SORT_OPTIONS = [
  { id: 'alpha', label: 'Ordre alphabétique', shortLabel: 'A → Z' },
  { id: 'recent', label: 'Plus récent', shortLabel: 'Récent' },
  { id: 'price-asc', label: 'Prix croissant', shortLabel: 'Prix ↑' },
  { id: 'price-desc', label: 'Prix décroissant', shortLabel: 'Prix ↓' },
];

let allItems = [];
let currentSort = 'alpha';
let activeFilters = { type: [], cuisine: [] };
let listHasAnimated = false;
let addItemModal = null;
let detailModal = null;
let filterModal = null;
let isRolling = false;
let restaurantsAbort = null;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getFieldLabel(fieldName, value) {
  if (!value) return '';
  const field = CATEGORY.fields.find((f) => f.name === fieldName);
  const base = field?.options?.find((opt) => opt.value === value);
  if (base) return base.label;

  const custom = getCustomOptions(`restaurants.${fieldName}`).find((opt) => opt.value === value);
  return custom?.label || formatOptionLabel(value.replace(/_/g, ' '));
}

function getMapsUrl(item) {
  if (item.lienMaps) return item.lienMaps;
  if (item.latitude != null && item.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
  }
  if (item.adresse) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.adresse)}`;
  }
  return null;
}

function parsePrice(value) {
  if (value == null || value === '') return null;
  const num = parseFloat(String(value).replace(/[^\d,.-]/g, '').replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

function getFieldOptions(fieldName) {
  const field = CATEGORY.fields.find((f) => f.name === fieldName);
  const base = field?.options || [];
  const custom = getCustomOptions(`restaurants.${fieldName}`);
  const seen = new Set();
  return [...base, ...custom].filter((opt) => {
    if (seen.has(opt.value)) return false;
    seen.add(opt.value);
    return true;
  });
}

function getAvailableFilterOptions(fieldName, items = allItems) {
  const counts = new Map();
  for (const item of items) {
    const value = item[fieldName];
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  const result = [];
  const seen = new Set();

  for (const opt of getFieldOptions(fieldName)) {
    if ((counts.get(opt.value) || 0) > 0) {
      result.push(opt);
      seen.add(opt.value);
    }
  }

  for (const [value, count] of counts) {
    if (count > 0 && !seen.has(value)) {
      result.push({ value, label: getFieldLabel(fieldName, value) });
    }
  }

  return result;
}

function pruneActiveFilters() {
  const availableType = new Set(getAvailableFilterOptions('type').map((opt) => opt.value));
  const availableCuisine = new Set(getAvailableFilterOptions('cuisine').map((opt) => opt.value));
  const type = (activeFilters.type || []).filter((value) => availableType.has(value));
  const cuisine = (activeFilters.cuisine || []).filter((value) => availableCuisine.has(value));

  if (
    type.length !== (activeFilters.type?.length || 0)
    || cuisine.length !== (activeFilters.cuisine?.length || 0)
  ) {
    activeFilters = { type, cuisine };
  }
}

function getFilterState() {
  return {
    sort: currentSort,
    type: activeFilters.type || [],
    cuisine: activeFilters.cuisine || [],
  };
}

function applyFilters(items) {
  const types = activeFilters.type || [];
  const cuisines = activeFilters.cuisine || [];

  return items.filter((item) => {
    if (types.length && (!item.type || !types.includes(item.type))) return false;
    if (cuisines.length && (!item.cuisine || !cuisines.includes(item.cuisine))) return false;
    return true;
  });
}

function getFilteredItems() {
  return applyFilters(allItems);
}

function sortItems(items, sortId = currentSort) {
  const copy = [...items];

  if (sortId === 'alpha') {
    return copy.sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr', { sensitivity: 'base' }));
  }

  if (sortId === 'price-asc' || sortId === 'price-desc') {
    const dir = sortId === 'price-asc' ? 1 : -1;
    return copy.sort((a, b) => {
      const pa = parsePrice(a.prix);
      const pb = parsePrice(b.prix);
      if (pa == null && pb == null) return 0;
      if (pa == null) return 1;
      if (pb == null) return -1;
      return (pa - pb) * dir;
    });
  }

  return copy;
}

function filtersAreActive() {
  return (activeFilters.type?.length || 0) > 0 || (activeFilters.cuisine?.length || 0) > 0;
}

function mountListToolbar() {
  const toolbar = document.getElementById('act-list-toolbar');
  if (!toolbar) return;

  toolbar.innerHTML = `
    <button type="button" class="act-filter-btn" id="act-filter-btn" aria-label="Filtrer et trier les restaurants">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
      </svg>
      <span>Filtres</span>
      <span class="act-filter-badge hidden" aria-hidden="true">0</span>
    </button>
  `;
}

function updateListSub(count, total = allItems.length) {
  const subEl = document.getElementById('list-sub');
  if (!subEl) return;

  const filtersActive = filtersAreActive();

  if (!count) {
    subEl.textContent = filtersActive ? 'Aucun résultat pour ces filtres' : 'Votre liste complète';
    return;
  }

  if (filtersActive && count !== total) {
    subEl.textContent = `${count} adresse${count > 1 ? 's' : ''} sur ${total}`;
    return;
  }

  subEl.textContent = `${count} adresse${count > 1 ? 's' : ''} enregistrée${count > 1 ? 's' : ''}`;
}

function applyListSettings({ sort, type, cuisine }) {
  if (sort && SORT_OPTIONS.some((opt) => opt.id === sort)) {
    currentSort = sort;
  }
  activeFilters = {
    type: type || [],
    cuisine: cuisine || [],
  };
  refreshListView();
}

function resetListSettings() {
  currentSort = 'alpha';
  activeFilters = { type: [], cuisine: [] };
  refreshListView();
}

function refreshListView() {
  filterModal?.updateTriggerBadge();
  renderRestaurantsList(sortItems(getFilteredItems()), { animate: !listHasAnimated });
  listHasAnimated = true;
}

function findItemById(id) {
  return allItems.find((item) => item.id === id) || null;
}

function getPickableItems(items = allItems) {
  const pickedToday = new Set(getTodayPickIds(PICK_SCOPE));
  return items.filter((item) => !item.done && !pickedToday.has(item.id));
}

function renderItemMeta(item) {
  const parts = [];
  if (item.type) parts.push(getFieldLabel('type', item.type));
  if (item.cuisine) parts.push(getFieldLabel('cuisine', item.cuisine));
  if (item.prix) parts.push(formatPrice(item.prix));
  return parts.join(' · ') || 'Restaurant';
}

function renderRestaurantChips(item) {
  const chips = [];
  if (item.type) {
    chips.push(`<span class="act-chip">${escapeHtml(getFieldLabel('type', item.type))}</span>`);
  }
  if (item.cuisine) {
    chips.push(`<span class="act-chip">${escapeHtml(getFieldLabel('cuisine', item.cuisine))}</span>`);
  }
  if (item.prix) {
    chips.push(`<span class="act-chip act-chip--muted">${escapeHtml(formatPrice(item.prix))}</span>`);
  }
  return chips.length ? `<div class="act-chips">${chips.join('')}</div>` : '';
}

function renderRestaurantLocation(item) {
  if (!item.adresse) return '';
  const mapsUrl = getMapsUrl(item);
  if (mapsUrl) {
    return `
      <a href="${mapsUrl}" class="act-location" target="_blank" rel="noopener noreferrer">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span>${escapeHtml(item.adresse)}</span>
      </a>
    `;
  }
  return `
    <p class="act-location act-location--text">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <span>${escapeHtml(item.adresse)}</span>
    </p>
  `;
}

function renderDailyCard(items) {
  const hero = document.getElementById('daily-hero');
  const inner = document.getElementById('daily-inner');
  if (!inner) return;

  const picked = items.length ? findItemById(getLatestPickId(PICK_SCOPE)) : null;

  if (!picked) {
    hero?.classList.add('hidden');
    inner.classList.remove('is-loading');
    return;
  }

  hero?.classList.remove('hidden');
  inner.classList.remove('is-loading');
  inner.className = 'act-feature-inner';
  inner.innerHTML = `
    <span class="cat-panel-accent" aria-hidden="true"></span>
    <p class="act-feature-eyebrow" id="daily-heading">
      <span class="act-feature-eyebrow-dot" aria-hidden="true"></span>
      Recommandation du jour
    </p>
    <h2 class="act-feature-title">${escapeHtml(picked.nom)}</h2>
    ${renderRestaurantChips(picked)}
    ${renderRestaurantLocation(picked)}
  `;
}

function updateDiceQuota() {
  const quotaEl = document.getElementById('dice-quota');
  const btn = document.getElementById('dice-roll-btn');
  const remaining = getRemainingPicks(PICK_SCOPE);
  const pickable = getPickableItems();

  if (quotaEl) quotaEl.textContent = getPickQuotaLabel(PICK_SCOPE);

  if (btn) {
    btn.disabled = isRolling || !pickable.length || remaining === 0;
  }
}

function renderDiceEmptyState() {
  const resultEl = document.getElementById('dice-result');
  if (!resultEl) return;

  resultEl.classList.remove('is-rolling');

  if (!allItems.length) {
    renderDiceResult(null);
    return;
  }

  const pickable = getPickableItems();
  const hasUntested = allItems.some((item) => !item.done);

  if (!hasUntested) {
    resultEl.innerHTML = `
      <p class="act-dice-result-label">Bravo !</p>
      <p class="act-dice-result-name">Toutes vos adresses sont testées</p>
    `;
    return;
  }

  if (!pickable.length && canPickToday(PICK_SCOPE)) {
    resultEl.innerHTML = hasUntested ? `
      <p class="act-dice-result-label">Déjà piochées</p>
      <p class="act-dice-result-name">Toutes vos adresses à tester l'ont été aujourd'hui</p>
    ` : `
      <p class="act-dice-result-label">Plus d'adresses dispo</p>
      <p class="act-dice-result-name">Ajoutez-en de nouvelles à piocher</p>
    `;
    return;
  }

  renderDiceResult(null);
}

function updateDiceIdleState() {
  const resultEl = document.getElementById('dice-result');
  if (!resultEl || isRolling) return;

  const pickable = getPickableItems();

  if (!allItems.length || (!pickable.length && canPickToday(PICK_SCOPE))) {
    renderDiceEmptyState();
    updateDiceQuota();
    return;
  }

  const latest = findItemById(getLatestPickId(PICK_SCOPE));

  if (latest) {
    const canRollAgain = canPickToday(PICK_SCOPE) && getRemainingPicks(PICK_SCOPE) > 0;
    renderDiceResult(
      latest,
      canRollAgain ? 'Votre pioche' : 'Votre adresse du jour',
      canRollAgain ? 'Envie d\'autre chose ? Relancez le dé' : '',
    );
  } else {
    resultEl.classList.remove('is-rolling');
    resultEl.innerHTML = `
      <p class="act-dice-result-label">Pas d'inspiration ?</p>
      <p class="act-dice-result-name">Un clic et c'est réglé</p>
    `;
  }

  updateDiceQuota();
}

function renderRestaurantsList(items, { animate = false } = {}) {
  const listEl = document.getElementById('restaurants-list');
  const subEl = document.getElementById('list-sub');
  if (!listEl) return;

  listEl.classList.remove('is-loading');
  listEl.classList.toggle('act-list--instant', !animate);

  if (subEl) {
    updateListSub(items.length);
  }

  if (!items.length) {
    const filtersActive = filtersAreActive();
    const hasAny = allItems.length > 0;
    listEl.innerHTML = `
      <li class="act-list-empty">
        <div class="cat-recent-empty">
          <span class="cat-recent-empty-icon">${sidebarIcon('restaurant')}</span>
          <p>${filtersActive && hasAny ? 'Aucun restaurant ne correspond à ces filtres' : 'Aucun restaurant enregistré'}</p>
          ${filtersActive && hasAny ? `
            <button type="button" class="cat-empty-cta" id="act-filter-reset-inline">Réinitialiser les filtres</button>
          ` : `
            <button type="button" class="cat-empty-cta" data-add-category="restaurants">Ajouter un restaurant</button>
          `}
        </div>
      </li>
    `;
    return;
  }

  listEl.innerHTML = items.map((item, index) => `
    <li class="act-list-item${item.done ? ' act-list-item--done' : ''}"${animate ? ` style="animation-delay: ${index * 40}ms"` : ''}>
      <div class="act-list-item-inner" data-restaurant-id="${item.id}" role="button" tabindex="0" aria-label="Voir ${escapeHtml(item.nom)}">
        <span class="cat-panel-accent" aria-hidden="true"></span>
        <div class="act-list-item-head">
          <span class="cat-panel-icon">${renderRestaurantTypeIcon(item.type)}</span>
          <div class="act-list-item-body">
            <h3>${escapeHtml(item.nom)}</h3>
            <p>${escapeHtml(renderItemMeta(item))}</p>
          </div>
          <span class="act-list-status ${item.done ? 'act-list-status--done' : 'act-list-status--todo'}">
            ${item.done ? `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            ` : `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9"/>
              </svg>
            `}
            ${item.done ? 'Testé' : 'À tester'}
          </span>
        </div>
        ${item.adresse ? renderRestaurantLocation(item) : ''}
      </div>
    </li>
  `).join('');
}

function updateHeader(items) {
  const subEl = document.getElementById('page-header-sub');
  if (!subEl) return;

  const total = items.length;
  const todo = items.filter((item) => !item.done).length;

  if (total === 0) subEl.textContent = 'Ajoutez vos premières adresses';
  else if (todo === 0) subEl.textContent = 'Toutes vos adresses sont testées';
  else if (todo === 1) subEl.textContent = '1 adresse à tester';
  else subEl.textContent = `${todo} adresses à tester`;
}

function renderDicePicking(phase = 'pick') {
  const resultEl = document.getElementById('dice-result');
  if (!resultEl) return;

  const label = phase === 'almost' ? 'Allez, ce sera…' : 'On pioche…';
  resultEl.innerHTML = `
    <p class="act-dice-result-label">${label}</p>
    <div class="act-dice-mask" aria-hidden="true">
      <span class="act-dice-mask-bar"></span>
      <span class="act-dice-mask-bar act-dice-mask-bar--short"></span>
    </div>
  `;
  resultEl.classList.add('is-rolling');
}

function renderDiceResult(item, label = 'Direction →', hint = '') {
  const resultEl = document.getElementById('dice-result');
  if (!resultEl) return;

  resultEl.classList.remove('is-rolling');

  if (!item) {
    resultEl.innerHTML = `
      <p class="act-dice-result-label">Rien à piocher</p>
      <p class="act-dice-result-name">Ajoutez des adresses d'abord</p>
    `;
    return;
  }

  resultEl.innerHTML = `
    <p class="act-dice-result-label">${escapeHtml(label)}</p>
    <p class="act-dice-result-name">${escapeHtml(item.nom)}</p>
    <p class="act-dice-result-meta">${escapeHtml(renderItemMeta(item))}${item.adresse ? ` · ${escapeHtml(item.adresse)}` : ''}</p>
    ${hint ? `<p class="act-dice-result-hint">${escapeHtml(hint)}</p>` : ''}
  `;
}

async function rollDice() {
  const pool = getPickableItems();

  if (isRolling || !pool.length || !canPickToday(PICK_SCOPE)) {
    renderDiceEmptyState();
    updateDiceQuota();
    return;
  }

  const btn = document.getElementById('dice-roll-btn');
  const pickedItem = pool[Math.floor(Math.random() * pool.length)];
  isRolling = true;
  if (btn) btn.disabled = true;

  const duration = 3600;
  const start = performance.now();

  const finish = async () => {
    await addTodayPick(pickedItem.id, PICK_SCOPE);
    renderDiceResult(pickedItem, 'Allez, ce sera…');
    renderDailyCard(allItems);
    isRolling = false;
    updateDiceIdleState();
  };

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);

    if (progress < 0.88) {
      renderDicePicking('pick');
    } else if (progress < 1) {
      renderDicePicking('almost');
    } else {
      finish();
      return;
    }

    requestAnimationFrame(tick);
  };

  renderDicePicking('pick');
  requestAnimationFrame(tick);
}

function bindEvents(signal) {
  document.getElementById('dice-roll-btn')?.addEventListener('click', rollDice, { signal });

  document.getElementById('act-filter-btn')?.addEventListener('click', () => {
    filterModal?.open();
  }, { signal });

  document.getElementById('restaurants-list')?.addEventListener('click', (event) => {
    if (event.target.closest('#act-filter-reset-inline')) {
      resetListSettings();
      return;
    }
    if (event.target.closest('.act-location')) return;
    const row = event.target.closest('[data-restaurant-id]');
    if (!row || !detailModal) return;
    const item = findItemById(row.dataset.restaurantId);
    if (item) detailModal.open(item);
  }, { signal });

  document.getElementById('restaurants-list')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('[data-restaurant-id]');
    if (!row || !detailModal) return;
    event.preventDefault();
    const item = findItemById(row.dataset.restaurantId);
    if (item) detailModal.open(item);
  }, { signal });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-add-category]');
    if (!trigger || !addItemModal) return;
    event.preventDefault();
    addItemModal.open(trigger.dataset.addCategory);
  }, { signal });
}

async function loadRestaurants() {
  const listEl = document.getElementById('restaurants-list');
  const dailyHero = document.getElementById('daily-hero');
  const dailyInner = document.getElementById('daily-inner');

  if (listEl) {
    listEl.classList.add('is-loading');
    listEl.innerHTML = `
      <li class="skel-block skel-block--line skel-shimmer" aria-hidden="true"></li>
      <li class="skel-block skel-block--line skel-shimmer" aria-hidden="true"></li>
      <li class="skel-block skel-block--line skel-shimmer" aria-hidden="true"></li>
    `;
  }

  const [items] = await Promise.all([
    fetchAllItems(COLLECTION),
    loadTodayPicks(PICK_SCOPE),
  ]);

  const hasPick = Boolean(getLatestPickId(PICK_SCOPE));

  if (hasPick && dailyInner) {
    dailyHero?.classList.remove('hidden');
    dailyInner.classList.add('is-loading');
  } else {
    dailyHero?.classList.add('hidden');
  }

  allItems = items;
  pruneActiveFilters();
  updateHeader(allItems);
  renderDailyCard(allItems);
  refreshListView();
  updateDiceIdleState();
}

export function refreshRestaurantsPage() {
  return loadRestaurants();
}

export function destroyRestaurantsPage() {
  isRolling = false;
  listHasAnimated = false;
  currentSort = 'alpha';
  activeFilters = { type: [], cuisine: [] };
  restaurantsAbort?.abort();
  restaurantsAbort = null;
  filterModal?.destroy();
  filterModal = null;
  detailModal?.destroy?.();
  addItemModal?.close();
  detailModal = null;
}

export async function initRestaurantsPage(user, { addItemModal: sharedModal } = {}) {
  destroyRestaurantsPage();
  restaurantsAbort = new AbortController();
  const { signal } = restaurantsAbort;

  getUserDisplayName(user);

  if (new URLSearchParams(window.location.search).get('reset-pioche') === '1') {
    await resetTodayPicks(PICK_SCOPE);
    const url = new URL(window.location.href);
    url.searchParams.delete('reset-pioche');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  addItemModal = sharedModal ?? initAddItem({
    user,
    onAdded: () => loadRestaurants(),
    onUpdated: () => loadRestaurants(),
  });

  detailModal = initRestaurantDetail({
    theme: getCategoryById('restaurants')?.theme || 'rose',
    onChanged: () => loadRestaurants(),
    onEdit: async (item) => {
      await detailModal.close();
      addItemModal.openEdit('restaurants', item);
    },
  });

  mountListToolbar();

  filterModal = initListFilters({
    theme: getCategoryById('restaurants')?.theme || 'rose',
    title: 'Filtres',
    defaults: {
      sort: 'alpha',
      type: [],
      cuisine: [],
    },
    sections: [
      {
        id: 'sort',
        label: 'Trier',
        mode: 'single',
        options: SORT_OPTIONS.map((opt) => ({ value: opt.id, label: opt.label })),
      },
      {
        id: 'type',
        label: 'Type de lieu',
        mode: 'multi',
        getOptions: () => getAvailableFilterOptions('type'),
      },
      {
        id: 'cuisine',
        label: 'Cuisine',
        mode: 'multi',
        getOptions: () => getAvailableFilterOptions('cuisine'),
      },
    ],
    getState: getFilterState,
    onApply: applyListSettings,
  });

  bindEvents(signal);
  filterModal.updateTriggerBadge();
  loadRestaurants();
}
