import { HOME_CATEGORIES, MAP_THEME } from '../config.js';
import {
  countGeolocatedPlacesFromCache,
  getCollectionCountFromCache,
} from '../data/appDataCache.js';
import { escapeHtml } from '../lib/escape-html.js';
import { renderNavIcon } from '../lib/lucide-icon.js';
import { sidebarIcon } from './sidebar.js';

export const EXPLORER_SEARCH_HTML = `
      <div class="map-search explorer-search" id="explorer-search">
        <div class="map-search-row">
          <label class="map-search-field" for="explorer-search-input">
            <span class="map-search-icon" aria-hidden="true">
              ${renderNavIcon('search', { strokeWidth: 1.75, width: 16, height: 16 })}
            </span>
            <input
              type="search"
              id="explorer-search-input"
              class="map-search-input"
              placeholder="Rechercher une activité, un resto, un film…"
              autocomplete="off"
              enterkeyhint="search"
              aria-label="Rechercher dans toutes les catégories"
            />
            <button
              type="button"
              class="map-search-clear hidden"
              id="explorer-search-clear"
              aria-label="Effacer la recherche"
            >
              ${renderNavIcon('close', { strokeWidth: 2, width: 14, height: 14 })}
            </button>
          </label>
        </div>
        <ul class="map-search-results hidden" id="explorer-search-results" role="listbox" aria-label="Résultats de recherche"></ul>
      </div>
`;

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

export const EXPLORER_PAGE_SECTION_HTML = `
    <section class="home-explorer-section" aria-labelledby="home-explorer-heading">
      <div class="section-head">
        <div>
          <h2 id="home-explorer-heading">Explorer</h2>
          <p>Parcourir par catégorie</p>
        </div>
      </div>
      ${EXPLORER_SEARCH_HTML}
      <nav class="home-explorer" id="home-explorer" aria-label="Catégories"></nav>
    </section>
`;

function renderStatCard({
  href,
  theme,
  icon,
  value,
  label,
  ariaLabel = '',
  enriched = false,
  animateCounts = false,
}) {
  const countAttrs = animateCounts
    ? ` data-count-target="${value}" style="--count-digits: ${String(value).length}" aria-label="${value}"`
    : '';
  const countDisplay = animateCounts ? 0 : value;

  const statContent = enriched
    ? `
        <div class="cat-card-stat-row">
          <span class="cat-card-icon" aria-hidden="true">${icon}</span>
          <span class="cat-card-value"${countAttrs}>${countDisplay}</span>
        </div>
      `
    : `
        <span class="cat-card-icon" aria-hidden="true">${icon}</span>
        <span class="cat-card-value"${countAttrs}>${countDisplay}</span>
      `;

  return `
    <a href="${href}" class="cat-card cat-card--stat${enriched ? ' cat-card--enriched' : ''}" data-theme="${theme}"${ariaLabel ? ` aria-label="${ariaLabel}"` : ''}>
      <div class="cat-card-inner">
        <span class="cat-card-glow" aria-hidden="true"></span>
        ${statContent}
        <span class="cat-card-label">${label}</span>
      </div>
    </a>
  `;
}

function renderExplorerMapCard(enriched = false, animateCounts = false) {
  const totalPlaces = countGeolocatedPlacesFromCache();

  return renderStatCard({
    href: '#carte',
    theme: MAP_THEME,
    icon: sidebarIcon('map'),
    value: totalPlaces,
    label: 'Carte interactive',
    ariaLabel: 'Ouvrir la carte interactive',
    enriched,
    animateCounts,
  });
}

/** Aligné sur les listes Activités / Restos (lieux liés à un voyage exclus). */
const EXCLUDE_TRAVEL_LINKED_COUNTS = new Set(['activities', 'restaurants']);

export function renderExplorerSection(
  root = document.getElementById('home-explorer'),
  { enriched = false, animateCounts = false } = {},
) {
  if (!root) return;

  root.innerHTML = renderExplorerMapCard(enriched, animateCounts) + HOME_CATEGORIES.map((cat) => {
    const count = getCollectionCountFromCache(cat.id, {
      excludeTravelLinked: EXCLUDE_TRAVEL_LINKED_COUNTS.has(cat.id),
    });
    return renderStatCard({
      href: cat.href,
      theme: cat.theme,
      icon: sidebarIcon(cat.icon),
      value: count,
      label: escapeHtml(cat.label),
      enriched,
      animateCounts,
    });
  }).join('');
}
