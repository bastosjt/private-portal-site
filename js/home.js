import { COUPLE_START_DATE, HOME_CATEGORIES, getUserDisplayName } from './config.js';
import { fetchRecentItems, fetchCollectionCount, fetchWeekItemsCount } from './firestore.js';
import { sidebarIcon } from './components/sidebar.js';
import { initAddItem } from './components/add-item.js';

const COLLECTION_IDS = HOME_CATEGORIES.map((cat) => cat.id);
let currentUserName = '';
let addItemModal = null;

function formatShortDate(value) {
  if (!value) return '';
  const date = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
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
  if (total === 0) return 'Votre espace partagé';
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

function getItemTitle(item, titleKey) {
  return item[titleKey] || item.nom || item.titre || item.destination || 'Sans titre';
}

function renderRecentItem(item, titleKey, href) {
  const title = getItemTitle(item, titleKey);
  const date = formatShortDate(item.createdAt);
  return `
    <li>
      <a href="${href}" class="cat-recent-item">
        <span class="cat-recent-dot" aria-hidden="true"></span>
        <span class="cat-recent-title">${escapeHtml(title)}</span>
        ${date ? `<time class="cat-recent-date">${date}</time>` : ''}
      </a>
    </li>
  `;
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

export function initHomePage(user) {
  currentUserName = getUserDisplayName(user);
  addItemModal = initAddItem({ user, onAdded: () => loadHomeData() });
  initPageHeader();
  renderDaysCounter();
  bindAddTriggers();
  loadHomeData();
}

function bindAddTriggers() {
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-add-category]');
    if (!trigger || !addItemModal) return;
    event.preventDefault();
    addItemModal.open(trigger.dataset.addCategory);
  });
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

  const [counts, recents, weekCount] = await Promise.all([
    Promise.all(
      HOME_CATEGORIES.map(async (cat) => ({
        ...cat,
        count: await fetchCollectionCount(cat.id),
      })),
    ),
    Promise.all(
      HOME_CATEGORIES.map(async (cat) => ({
        ...cat,
        items: await fetchRecentItems(cat.id, 3),
      })),
    ),
    fetchWeekItemsCount(COLLECTION_IDS),
  ]);

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
        ? `<ul class="cat-recent-list">${cat.items.map((item) => renderRecentItem(item, cat.titleKey, cat.href)).join('')}</ul>`
        : `<div class="cat-recent-empty">
            <span class="cat-recent-empty-icon">${sidebarIcon(cat.icon)}</span>
            <p>Rien pour l'instant</p>
            <button type="button" class="cat-empty-cta" data-add-category="${cat.id}">
              ${escapeHtml(cat.addLabel)}
            </button>
          </div>`;

      return `
        <section class="cat-panel" data-theme="${cat.theme}" style="animation-delay: ${index * 60}ms">
          <div class="cat-panel-inner">
            <span class="cat-panel-accent" aria-hidden="true"></span>
            <div class="cat-panel-head">
              <div class="cat-panel-title">
                <span class="cat-panel-icon">${sidebarIcon(cat.icon)}</span>
                <div>
                  <h3>${cat.label}</h3>
                  <p>${count} idée${count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <a href="${cat.href}" class="cat-panel-link">Voir tout</a>
            </div>
            ${itemsHtml}
          </div>
        </section>
      `;
    }).join('');
    recentEl.classList.remove('is-loading');
  }
}
