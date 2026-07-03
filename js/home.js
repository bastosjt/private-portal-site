import { COUPLE_START_DATE, HOME_CATEGORIES } from './config.js';
import { fetchRecentItems, fetchCollectionCount } from './firestore.js';
import { sidebarIcon } from './components/sidebar.js';

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

function getItemTitle(item, titleKey) {
  return item[titleKey] || item.nom || item.titre || item.destination || 'Sans titre';
}

function renderRecentItem(item, titleKey) {
  const title = getItemTitle(item, titleKey);
  const date = formatShortDate(item.createdAt);
  return `
    <li class="cat-recent-item">
      <span class="cat-recent-dot" aria-hidden="true"></span>
      <span class="cat-recent-title">${escapeHtml(title)}</span>
      ${date ? `<time class="cat-recent-date">${date}</time>` : ''}
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

export function initHomePage() {
  renderDaysCounter();
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
    sinceEl.textContent = `Depuis le ${formatStartDate(COUPLE_START_DATE)}`;
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

  if (statsEl) statsEl.classList.add('is-loading');
  if (recentEl) recentEl.classList.add('is-loading');

  const counts = await Promise.all(
    HOME_CATEGORIES.map(async (cat) => ({
      ...cat,
      count: await fetchCollectionCount(cat.id),
    })),
  );

  const recents = await Promise.all(
    HOME_CATEGORIES.map(async (cat) => ({
      ...cat,
      items: await fetchRecentItems(cat.id, 3),
    })),
  );

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
    initCategoryCards(statsEl.querySelectorAll('.cat-card--stat'));
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
            <span>Ajoutez votre première idée</span>
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

  const total = counts.reduce((sum, cat) => sum + cat.count, 0);
  const totalEl = document.getElementById('stats-total');
  if (totalEl) totalEl.textContent = total;
}

function initCategoryCards(cards) {
  cards.forEach((card) => initTilt(card, { max: 10, scale: 1.02 }));
}

function initTilt(el, { max = 12, scale = 1.02 } = {}) {
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const inner = el.querySelector('.cat-card-inner')
    || el.querySelector('.days-card-inner')
    || el.querySelector('.card-3d-inner')
    || el;

  el.addEventListener('pointermove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    inner.style.transform =
      `perspective(800px) rotateY(${x * max * 2}deg) rotateX(${-y * max * 2}deg) scale3d(${scale}, ${scale}, ${scale})`;
  });

  el.addEventListener('pointerleave', () => {
    inner.style.transform = '';
  });
}
