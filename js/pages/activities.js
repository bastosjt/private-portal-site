import { getCategoryById, getUserDisplayName } from '../config.js';
import { formatItemPrice, formatOptionLabel, sortOptionsByLabel, compareItemsByPrice, hasItemPrice } from '../utils/format.js';
import { fetchAllItems } from '../api/firestore.js';
import { sidebarIcon } from '../components/sidebar.js';
import { renderActivityTypeIcon } from '../config/activity-type-icons.js';
import { initAddItem } from '../components/add-item.js';
import { initActivityDetail } from '../components/activity-detail.js';
import { initListFilters } from '../components/list-filters.js';
import {
  getActivityListMetaParts,
  hasActivitySchedule,
  renderActivityScheduleNote,
} from '../utils/activity-schedule.js';
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

const CATEGORY = getCategoryById('activities');
const COLLECTION = 'activities';

const SORT_OPTIONS = [
  { id: 'alpha', label: 'Ordre alphabétique', shortLabel: 'A → Z' },
  { id: 'recent', label: 'Plus récent', shortLabel: 'Récent' },
  { id: 'price-asc', label: 'Prix croissant', shortLabel: 'Prix ↑' },
  { id: 'price-desc', label: 'Prix décroissant', shortLabel: 'Prix ↓' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tout' },
  { value: 'todo', label: 'Non fait' },
  { value: 'done', label: 'Fait' },
];

let allItems = [];
let currentSort = 'alpha';
let activeFilters = { categorie: [], status: 'all' };
let listHasAnimated = false;
let addItemModal = null;
let detailModal = null;
let filterModal = null;
let isRolling = false;
let activitiesAbort = null;
let listViewMode = 'list';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const DEPRECATED_CUISINE = new Set(['pizza', 'burgers', 'burger', 'americaine']);
const DEPRECATED_ACTIVITY_CATEGORIES = new Set(['feux_d_artifices']);

function getFieldLabel(fieldName, value) {
  if (!value) return '';
  if (fieldName === 'categorie' && value === 'feux_d_artifices') {
    return 'Feux d\'artifice';
  }
  const field = CATEGORY.fields.find((f) => f.name === fieldName);
  const base = field?.options?.find((opt) => opt.value === value);
  if (base) return base.label;

  const custom = getCustomOptions(`activities.${fieldName}`).find((opt) => opt.value === value);
  return custom?.label || formatOptionLabel(value.replace(/_/g, ' '));
}

function getMapsUrl(item) {
  if (item.latitude != null && item.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
  }
  if (item.localisation) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.localisation)}`;
  }
  return null;
}

function getFieldOptions(fieldName) {
  const field = CATEGORY.fields.find((f) => f.name === fieldName);
  const base = field?.options || [];
  const custom = getCustomOptions(`activities.${fieldName}`);
  const seen = new Set();
  return sortOptionsByLabel([...base, ...custom].filter((opt) => {
    if (seen.has(opt.value)) return false;
    if (fieldName === 'cuisine' && DEPRECATED_CUISINE.has(opt.value)) return false;
    if (fieldName === 'categorie' && DEPRECATED_ACTIVITY_CATEGORIES.has(opt.value)) return false;
    seen.add(opt.value);
    return true;
  }));
}

function getCategorieOptions() {
  return getFieldOptions('categorie');
}

function getAvailableCategorieOptions(items = allItems) {
  const counts = new Map();
  for (const item of items) {
    if (!item.categorie) continue;
    counts.set(item.categorie, (counts.get(item.categorie) || 0) + 1);
  }

  const result = [];
  const seen = new Set();

  for (const opt of getCategorieOptions()) {
    if ((counts.get(opt.value) || 0) > 0) {
      result.push(opt);
      seen.add(opt.value);
    }
  }

  for (const [value, count] of counts) {
    if (count > 0 && !seen.has(value)) {
      result.push({ value, label: getFieldLabel('categorie', value) });
    }
  }

  return sortOptionsByLabel(result);
}

function pruneActiveFilters() {
  const available = new Set(getAvailableCategorieOptions().map((opt) => opt.value));
  const categorie = (activeFilters.categorie || []).filter((value) => available.has(value));
  if (categorie.length !== (activeFilters.categorie?.length || 0)) {
    activeFilters = { ...activeFilters, categorie };
  }
}

function filtersAreActive() {
  return (activeFilters.categorie?.length || 0) > 0 || activeFilters.status !== 'all';
}

function getFilterState() {
  return {
    status: activeFilters.status || 'all',
    sort: currentSort,
    categorie: activeFilters.categorie || [],
  };
}

function applyFilters(items) {
  let result = items;

  if (activeFilters.status === 'todo') {
    result = result.filter((item) => !item.done);
  } else if (activeFilters.status === 'done') {
    result = result.filter((item) => item.done);
  }

  const categories = activeFilters.categorie || [];
  if (!categories.length) return result;

  const allowed = new Set(categories);
  return result.filter((item) => item.categorie && allowed.has(item.categorie));
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
    return copy.sort((a, b) => compareItemsByPrice(a, b, dir));
  }

  return copy;
}

function mountListToolbar() {
  const toolbar = document.getElementById('act-list-toolbar');
  if (!toolbar) return;

  toolbar.innerHTML = `
    <button type="button" class="act-filter-btn" id="act-filter-btn" aria-label="Filtrer et trier les activités">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
      </svg>
      <span>Filtres</span>
      <span class="act-filter-badge hidden" aria-hidden="true">0</span>
    </button>
  `;
}

function setActivitiesViewMode(mode) {
  listViewMode = mode === 'map' ? 'map' : 'list';

  const listPanel = document.getElementById('activities-list-panel');
  const mapPanel = document.getElementById('activities-map-panel');
  const listBtn = document.getElementById('activities-view-list');
  const mapBtn = document.getElementById('activities-view-map');
  if (!listPanel || !mapPanel || !listBtn || !mapBtn) return;

  const isList = listViewMode === 'list';
  listPanel.classList.toggle('hidden', !isList);
  listPanel.toggleAttribute('hidden', !isList);
  mapPanel.classList.toggle('hidden', isList);
  mapPanel.toggleAttribute('hidden', isList);

  listBtn.classList.toggle('is-active', isList);
  listBtn.setAttribute('aria-selected', isList ? 'true' : 'false');
  mapBtn.classList.toggle('is-active', !isList);
  mapBtn.setAttribute('aria-selected', !isList ? 'true' : 'false');
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
    subEl.textContent = `${count} activité${count > 1 ? 's' : ''} sur ${total}`;
    return;
  }

  subEl.textContent = `${count} activité${count > 1 ? 's' : ''} enregistrée${count > 1 ? 's' : ''}`;
}

function applyListSettings({ sort, categorie, status }) {
  if (sort && SORT_OPTIONS.some((opt) => opt.id === sort)) {
    currentSort = sort;
  }
  activeFilters = {
    categorie: categorie || [],
    status: STATUS_FILTER_OPTIONS.some((opt) => opt.value === status) ? status : 'all',
  };
  refreshListView();
}

function resetListSettings() {
  currentSort = 'alpha';
  activeFilters = { categorie: [], status: 'all' };
  refreshListView();
}

function refreshListView() {
  filterModal?.updateTriggerBadge();
  renderActivitiesList(sortItems(getFilteredItems()), { animate: !listHasAnimated });
  listHasAnimated = true;
}

function findItemById(id) {
  return allItems.find((item) => item.id === id) || null;
}

function getPickableItems(items = allItems) {
  const pickedToday = new Set(getTodayPickIds());
  return items.filter((item) => !item.done && !pickedToday.has(item.id));
}

function renderActivityChips(item) {
  const chips = [];
  if (item.categorie) {
    chips.push(`<span class="act-chip">${escapeHtml(getFieldLabel('categorie', item.categorie))}</span>`);
  }
  if (hasItemPrice(item)) {
    chips.push(`<span class="act-chip act-chip--muted">${escapeHtml(formatItemPrice(item))}</span>`);
  }
  return chips.length ? `<div class="act-chips">${chips.join('')}</div>` : '';
}

const scheduleNoteOptions = {
  getDisponibiliteLabel: (value) => getFieldLabel('disponibilite', value),
  escapeHtml,
  showPeriod: false,
};

function getActivityMetaLine(item) {
  const parts = getActivityListMetaParts(item, {
    getCategorieLabel: (value) => getFieldLabel('categorie', value),
    formatItemPrice,
  });
  return parts.join(' · ') || 'Activité';
}

function renderActivityLocation(item) {
  if (!item.localisation) return '';
  const mapsUrl = getMapsUrl(item);
  if (mapsUrl) {
    return `
      <a href="${mapsUrl}" class="act-location" target="_blank" rel="noopener noreferrer">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span>${escapeHtml(item.localisation)}</span>
      </a>
    `;
  }
  return `
    <p class="act-location act-location--text">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <span>${escapeHtml(item.localisation)}</span>
    </p>
  `;
}

function renderDailyCard(items) {
  const hero = document.getElementById('daily-hero');
  const inner = document.getElementById('daily-inner');
  if (!inner) return;

  const picked = items.length ? findItemById(getLatestPickId()) : null;

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
    ${renderActivityChips(picked)}
    ${renderActivityScheduleNote(picked, scheduleNoteOptions)}
    ${renderActivityLocation(picked)}
  `;
}

function updateDiceQuota() {
  const quotaEl = document.getElementById('dice-quota');
  const btn = document.getElementById('dice-roll-btn');
  const remaining = getRemainingPicks();
  const pickable = getPickableItems();

  if (quotaEl) quotaEl.textContent = getPickQuotaLabel();

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
  const hasUndone = allItems.some((item) => !item.done);

  if (!hasUndone) {
    resultEl.innerHTML = `
      <p class="act-dice-result-label">Bravo !</p>
      <p class="act-dice-result-name">Toutes vos idées sont faites</p>
    `;
    return;
  }

  if (!pickable.length && canPickToday()) {
    resultEl.innerHTML = hasUndone ? `
      <p class="act-dice-result-label">Déjà piochées</p>
      <p class="act-dice-result-name">Toutes vos idées à faire l'ont été aujourd'hui</p>
    ` : `
      <p class="act-dice-result-label">Plus d'idées dispo</p>
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

  if (!allItems.length || (!pickable.length && canPickToday())) {
    renderDiceEmptyState();
    updateDiceQuota();
    return;
  }

  const latest = findItemById(getLatestPickId());

  if (latest) {
    const canRollAgain = canPickToday() && getRemainingPicks() > 0;
    renderDiceResult(
      latest,
      canRollAgain ? 'Votre pioche' : 'Votre idée du jour',
      canRollAgain ? 'Envie d\'autre chose ? Relancez le dé' : '',
    );
  } else {
    resultEl.classList.remove('is-rolling');
    resultEl.innerHTML = `
      <p class="act-dice-result-label">Toujours pas d'idée ?</p>
      <p class="act-dice-result-name">Un clic et c'est réglé</p>
    `;
  }

  updateDiceQuota();
}

function reorderActivitiesList(items) {
  const listEl = document.getElementById('activities-list');
  const subEl = document.getElementById('list-sub');
  if (!listEl || !items.length) return false;

  const rowById = new Map();
  listEl.querySelectorAll('.act-list-item [data-activity-id]').forEach((inner) => {
    const li = inner.closest('.act-list-item');
    if (li) rowById.set(inner.dataset.activityId, li);
  });

  if (rowById.size !== items.length) return false;

  for (const item of items) {
    const li = rowById.get(item.id);
    if (!li) return false;
    if (li.classList.contains('act-list-item--done') !== Boolean(item.done)) return false;
    listEl.appendChild(li);
  }

  listEl.classList.add('act-list--instant');

  if (subEl) {
    updateListSub(items.length);
  }

  return true;
}

function renderActivitiesList(items, { animate = false } = {}) {
  const listEl = document.getElementById('activities-list');
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
          <span class="cat-recent-empty-icon">${sidebarIcon('activity')}</span>
          <p>${filtersActive && hasAny ? 'Aucune activité ne correspond à ces filtres' : 'Aucune activité enregistrée'}</p>
          ${filtersActive && hasAny ? `
            <button type="button" class="cat-empty-cta" id="act-filter-reset-inline">Réinitialiser les filtres</button>
          ` : `
            <button type="button" class="cat-empty-cta" data-add-category="activities">Ajouter une activité</button>
          `}
        </div>
      </li>
    `;
    return;
  }

  listEl.innerHTML = items.map((item, index) => `
    <li class="act-list-item${item.done ? ' act-list-item--done' : ''}${hasActivitySchedule(item) ? ' act-list-item--scheduled' : ''}"${animate ? ` style="animation-delay: ${index * 40}ms"` : ''}>
      <div class="act-list-item-inner" data-activity-id="${item.id}" role="button" tabindex="0" aria-label="Voir ${escapeHtml(item.nom)}">
        <span class="cat-panel-accent" aria-hidden="true"></span>
        <div class="act-list-item-head">
          <span class="cat-panel-icon">${renderActivityTypeIcon(item.categorie)}</span>
          <div class="act-list-item-body">
            <h3>${escapeHtml(item.nom)}</h3>
            <p class="act-list-meta">${escapeHtml(getActivityMetaLine(item))}</p>
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
            ${item.done ? 'Fait' : 'Non fait'}
          </span>
        </div>
        ${renderActivityScheduleNote(item, scheduleNoteOptions)}
        ${item.localisation ? renderActivityLocation(item) : ''}
      </div>
    </li>
  `).join('');
}

function updateHeader(items) {
  const subEl = document.getElementById('page-header-sub');
  if (!subEl) return;

  const total = items.length;
  const todo = items.filter((item) => !item.done).length;

  if (total === 0) subEl.textContent = 'Ajoutez vos premières sorties';
  else if (todo === 0) subEl.textContent = 'Toutes vos idées sont faites';
  else if (todo === 1) subEl.textContent = '1 idée à explorer';
  else subEl.textContent = `${todo} idées à explorer`;
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
      <p class="act-dice-result-name">Ajoutez des idées d'abord</p>
    `;
    return;
  }

  resultEl.innerHTML = `
    <p class="act-dice-result-label">${escapeHtml(label)}</p>
    <p class="act-dice-result-name">${escapeHtml(item.nom)}</p>
    <p class="act-dice-result-meta">${escapeHtml(getActivityMetaLine(item))}${item.localisation ? ` · ${escapeHtml(item.localisation)}` : ''}</p>
    ${renderActivityScheduleNote(item, scheduleNoteOptions)}
    ${hint ? `<p class="act-dice-result-hint">${escapeHtml(hint)}</p>` : ''}
  `;
}

async function rollDice() {
  const pool = getPickableItems();

  if (isRolling || !pool.length || !canPickToday()) {
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
    await addTodayPick(pickedItem.id);
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

  document.getElementById('activities-view-switch')?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-view]');
    if (!btn) return;
    setActivitiesViewMode(btn.dataset.view);
  }, { signal });

  document.getElementById('act-filter-btn')?.addEventListener('click', () => {
    filterModal?.open();
  }, { signal });

  document.getElementById('activities-list')?.addEventListener('click', (event) => {
    if (event.target.closest('#act-filter-reset-inline')) {
      resetListSettings();
      return;
    }
    if (event.target.closest('.act-location')) return;
    const row = event.target.closest('[data-activity-id]');
    if (!row || !detailModal) return;
    const item = findItemById(row.dataset.activityId);
    if (item) detailModal.open(item);
  }, { signal });

  document.getElementById('activities-list')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('[data-activity-id]');
    if (!row || !detailModal) return;
    event.preventDefault();
    const item = findItemById(row.dataset.activityId);
    if (item) detailModal.open(item);
  }, { signal });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-add-category]');
    if (!trigger || !addItemModal) return;
    event.preventDefault();
    addItemModal.open(trigger.dataset.addCategory);
  }, { signal });
}

async function loadActivities() {
  const activitiesList = document.getElementById('activities-list');
  const dailyHero = document.getElementById('daily-hero');
  const dailyInner = document.getElementById('daily-inner');

  if (activitiesList) {
    activitiesList.classList.add('is-loading');
    activitiesList.innerHTML = `
      <li class="skel-block skel-block--line skel-shimmer" aria-hidden="true"></li>
      <li class="skel-block skel-block--line skel-shimmer" aria-hidden="true"></li>
      <li class="skel-block skel-block--line skel-shimmer" aria-hidden="true"></li>
    `;
  }

  const [items] = await Promise.all([
    fetchAllItems(COLLECTION),
    loadTodayPicks(),
  ]);

  const hasPick = Boolean(getLatestPickId());

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

export function refreshActivitiesPage() {
  return loadActivities();
}

export function destroyActivitiesPage() {
  isRolling = false;
  listHasAnimated = false;
  listViewMode = 'list';
  currentSort = 'alpha';
  activeFilters = { categorie: [], status: 'all' };
  activitiesAbort?.abort();
  activitiesAbort = null;
  filterModal?.destroy();
  filterModal = null;
  detailModal?.destroy?.();
  addItemModal?.close();
  detailModal = null;
}

export async function initActivitiesPage(user, { addItemModal: sharedModal } = {}) {
  destroyActivitiesPage();
  activitiesAbort = new AbortController();
  const { signal } = activitiesAbort;

  getUserDisplayName(user);

  if (new URLSearchParams(window.location.search).get('reset-pioche') === '1') {
    await resetTodayPicks('activities');
    const url = new URL(window.location.href);
    url.searchParams.delete('reset-pioche');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  addItemModal = sharedModal ?? initAddItem({
    user,
    onAdded: () => loadActivities(),
    onUpdated: () => loadActivities(),
  });

  detailModal = initActivityDetail({
    theme: getCategoryById('activities')?.theme || 'cyan',
    onChanged: () => loadActivities(),
    onEdit: async (item) => {
      await detailModal.close();
      addItemModal.openEdit('activities', item);
    },
  });

  mountListToolbar();
  setActivitiesViewMode('list');

  filterModal = initListFilters({
    theme: getCategoryById('activities')?.theme || 'cyan',
    title: 'Filtres',
    defaults: {
      status: 'all',
      sort: 'alpha',
      categorie: [],
    },
    sections: [
      {
        id: 'status',
        label: 'Statut',
        mode: 'single',
        collapsible: false,
        options: STATUS_FILTER_OPTIONS,
      },
      {
        id: 'sort',
        label: 'Trier',
        mode: 'single',
        options: SORT_OPTIONS.map((opt) => ({ value: opt.id, label: opt.label })),
      },
      {
        id: 'categorie',
        label: 'Type',
        mode: 'multi',
        getOptions: () => getAvailableCategorieOptions(),
      },
    ],
    getState: getFilterState,
    onApply: applyListSettings,
  });

  bindEvents(signal);
  filterModal.updateTriggerBadge();
  loadActivities();
}
