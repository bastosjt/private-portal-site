import { HOME_CATEGORIES, MAP_THEME } from '../config.js';
import {
  countGeolocatedPlacesFromCache,
  getCollectionCountFromCache,
} from '../data/appDataCache.js';
import { escapeHtml } from '../lib/escape-html.js';
import { sidebarIcon } from './sidebar.js';

export const EXPLORER_SECTION_HTML = `
    <section class="home-explorer-section" aria-labelledby="home-explorer-heading">
      <div class="section-head">
        <div>
          <h2 id="home-explorer-heading">Explorer</h2>
          <p>Parcourir par catégorie</p>
        </div>
      </div>
      <nav class="home-explorer" id="home-explorer" aria-label="Catégories"></nav>
    </section>
`;

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

export function renderExplorerSection(root = document.getElementById('home-explorer')) {
  if (!root) return;

  root.innerHTML = renderExplorerMapCard() + HOME_CATEGORIES.map((cat) => {
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
