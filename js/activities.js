import { getCategoryById, getUserDisplayName } from './config.js?v=3';
import { formatPrice } from './utils/format.js';
import { fetchAllItems } from './firestore.js?v=4';
import { sidebarIcon } from './components/sidebar.js';
import { initAddItem } from './components/add-item.js?v=5';
import { initActivityDetail } from './components/activity-detail.js';
import { getCustomOptions } from './services/custom-options.js';
import {
  addTodayPick,
  canPickToday,
  getLatestPickId,
  getPickQuotaLabel,
  getRemainingPicks,
  getTodayPickIds,
  loadTodayPicks,
  resetTodayPicks,
} from './services/daily-picks.js?v=2';

const CATEGORY = getCategoryById('activities');
const COLLECTION = 'activities';

const SORT_OPTIONS = [
  { id: 'recent', label: 'Plus récent' },
  { id: 'alpha', label: 'Ordre alphabétique' },
  { id: 'price-asc', label: 'Prix croissant' },
  { id: 'price-desc', label: 'Prix décroissant' },
];

let allItems = [];
let currentSort = 'recent';
let addItemModal = null;
let detailModal = null;
let isRolling = false;

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

  const custom = getCustomOptions(`activities.${fieldName}`).find((opt) => opt.value === value);
  return custom?.label || value.replace(/_/g, ' ');
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

function parsePrice(value) {
  if (value == null || value === '') return null;
  const num = parseFloat(String(value).replace(/[^\d,.-]/g, '').replace(',', '.'));
  return Number.isFinite(num) ? num : null;
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

function getSortLabel(sortId = currentSort) {
  return SORT_OPTIONS.find((opt) => opt.id === sortId)?.label || 'Plus récent';
}

function isSortMenuDesktop() {
  return window.matchMedia('(min-width: 640px)').matches;
}

function closeSortMenu() {
  const menu = document.getElementById('act-sort-menu');
  const trigger = document.getElementById('act-sort-trigger');
  menu?.classList.remove('is-open');
  trigger?.setAttribute('aria-expanded', 'false');
}

function openSortMenu() {
  const menu = document.getElementById('act-sort-menu');
  const trigger = document.getElementById('act-sort-trigger');
  menu?.classList.add('is-open');
  trigger?.setAttribute('aria-expanded', 'true');
}

function updateSortUI() {
  const labelEl = document.getElementById('act-sort-label');
  if (labelEl) labelEl.textContent = getSortLabel();

  document.querySelectorAll('.act-sort-option').forEach((btn) => {
    const active = btn.dataset.sort === currentSort;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function setSort(sortId) {
  if (!SORT_OPTIONS.some((opt) => opt.id === sortId)) return;
  currentSort = sortId;
  updateSortUI();
  renderActivitiesList(sortItems(allItems));
  if (!isSortMenuDesktop()) closeSortMenu();
}

function refreshListView() {
  updateSortUI();
  renderActivitiesList(sortItems(allItems));
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
  if (item.prix) {
    chips.push(`<span class="act-chip act-chip--muted">${escapeHtml(formatPrice(item.prix))}</span>`);
  }
  return chips.length ? `<div class="act-chips">${chips.join('')}</div>` : '';
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

  if (!canPickToday() && latest) {
    renderDiceResult(latest, 'Votre idée du jour');
  } else if (latest) {
    resultEl.classList.remove('is-rolling');
    resultEl.innerHTML = `
      <p class="act-dice-result-label">Envie d'autre chose ?</p>
      <p class="act-dice-result-name">Relancez le dé</p>
    `;
  } else {
    resultEl.classList.remove('is-rolling');
    resultEl.innerHTML = `
      <p class="act-dice-result-label">Toujours pas d'idée ?</p>
      <p class="act-dice-result-name">Un clic et c'est réglé</p>
    `;
  }

  updateDiceQuota();
}

function renderActivitiesList(items) {
  const listEl = document.getElementById('activities-list');
  const subEl = document.getElementById('list-sub');
  if (!listEl) return;

  listEl.classList.remove('is-loading');

  if (subEl) {
    subEl.textContent = items.length
      ? `${items.length} activité${items.length > 1 ? 's' : ''} enregistrée${items.length > 1 ? 's' : ''}`
      : 'Votre liste complète';
  }

  if (!items.length) {
    listEl.innerHTML = `
      <li class="act-list-empty">
        <div class="cat-recent-empty">
          <span class="cat-recent-empty-icon">${sidebarIcon('activity')}</span>
          <p>Aucune activité enregistrée</p>
          <button type="button" class="cat-empty-cta" data-add-category="activities">Ajouter une activité</button>
        </div>
      </li>
    `;
    return;
  }

  listEl.innerHTML = items.map((item, index) => `
    <li class="act-list-item${item.done ? ' act-list-item--done' : ''}" style="animation-delay: ${index * 40}ms">
      <div class="act-list-item-inner" data-activity-id="${item.id}" role="button" tabindex="0" aria-label="Voir ${escapeHtml(item.nom)}">
        <span class="cat-panel-accent" aria-hidden="true"></span>
        <div class="act-list-item-head">
          <span class="cat-panel-icon">${sidebarIcon('activity')}</span>
          <div class="act-list-item-body">
            <h3>${escapeHtml(item.nom)}</h3>
            <p>${escapeHtml(getFieldLabel('categorie', item.categorie) || 'Activité')}${item.prix ? ` · ${escapeHtml(formatPrice(item.prix))}` : ''}</p>
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

function renderDiceResult(item, label = 'Direction →') {
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
    <p class="act-dice-result-meta">${escapeHtml(getFieldLabel('categorie', item.categorie) || 'Activité')}${item.localisation ? ` · ${escapeHtml(item.localisation)}` : ''}</p>
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

function bindEvents() {
  document.getElementById('dice-roll-btn')?.addEventListener('click', rollDice);

  const sortTrigger = document.getElementById('act-sort-trigger');
  const sortMenu = document.getElementById('act-sort-menu');

  sortTrigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (isSortMenuDesktop()) return;
    const expanded = sortTrigger.getAttribute('aria-expanded') === 'true';
    if (expanded) closeSortMenu();
    else openSortMenu();
  });

  sortMenu?.addEventListener('click', (event) => {
    const option = event.target.closest('[data-sort]');
    if (!option) return;
    setSort(option.dataset.sort);
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('#act-list-toolbar')) return;
    if (event.target.closest('.act-cat-panel')) return;
    closeSortMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSortMenu();
  });

  window.addEventListener('resize', () => {
    if (isSortMenuDesktop()) {
      closeSortMenu();
    }
  });

  document.getElementById('activities-list')?.addEventListener('click', (event) => {
    if (event.target.closest('.act-location')) return;
    const row = event.target.closest('[data-activity-id]');
    if (!row || !detailModal) return;
    const item = findItemById(row.dataset.activityId);
    if (item) detailModal.open(item);
  });

  document.getElementById('activities-list')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('[data-activity-id]');
    if (!row || !detailModal) return;
    event.preventDefault();
    const item = findItemById(row.dataset.activityId);
    if (item) detailModal.open(item);
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-add-category]');
    if (!trigger || !addItemModal) return;
    event.preventDefault();
    addItemModal.open(trigger.dataset.addCategory);
  });
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
  updateHeader(allItems);
  renderDailyCard(allItems);
  refreshListView();
  updateDiceIdleState();
}

export async function initActivitiesPage(user) {
  getUserDisplayName(user);

  if (new URLSearchParams(window.location.search).get('reset-pioche') === '1') {
    await resetTodayPicks();
    const url = new URL(window.location.href);
    url.searchParams.delete('reset-pioche');
    window.history.replaceState({}, '', url);
  }

  addItemModal = initAddItem({
    user,
    onAdded: () => loadActivities(),
    onUpdated: () => loadActivities(),
  });

  detailModal = initActivityDetail({
    onChanged: () => loadActivities(),
    onEdit: (item) => {
      detailModal.close();
      addItemModal.openEdit('activities', item);
    },
  });

  bindEvents();
  updateSortUI();
  loadActivities();
}
