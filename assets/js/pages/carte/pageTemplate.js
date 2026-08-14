import { MAP_THEME } from '../../config.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';

const THEME = MAP_THEME;

export const MAP_VIEW_HTML = `
  <main class="page-content map-page" data-theme="${THEME}">
    <section class="act-cat-panel act-cat-panel--map map-panel">
      <div class="map-panel-body">
        <div id="interactive-map" class="map-canvas" role="application" aria-label="Carte interactive"></div>
        <div class="map-travel-focus-chip hidden" id="map-travel-focus-chip" data-theme="blue" role="status" aria-live="polite">
          <span class="map-travel-focus-chip-icon" aria-hidden="true">
            ${renderNavIcon('travel', { strokeWidth: 1.75, width: 14, height: 14 })}
          </span>
          <span class="map-travel-focus-chip-label" id="map-travel-focus-chip-label">Mode voyage</span>
          <button type="button" class="map-travel-focus-chip-close" id="map-travel-focus-chip-close" aria-label="Quitter le mode voyage">
            ${renderNavIcon('close', { strokeWidth: 2, width: 14, height: 14 })}
          </button>
        </div>
        <div class="map-vignette" aria-hidden="true"></div>
        <div class="map-search" id="map-search">
          <div class="map-search-row">
            <label class="map-search-field" for="map-search-input">
              <span class="map-search-icon" aria-hidden="true">
                ${renderNavIcon('search', { strokeWidth: 1.75, width: 16, height: 16 })}
              </span>
              <input
                type="search"
                id="map-search-input"
                class="map-search-input"
                placeholder="Rechercher un lieu…"
                autocomplete="off"
                enterkeyhint="search"
                aria-label="Rechercher un lieu sur la carte"
              />
              <button
                type="button"
                class="map-search-clear hidden"
                id="map-search-clear"
                aria-label="Effacer la recherche"
              >
                ${renderNavIcon('close', { strokeWidth: 2, width: 14, height: 14 })}
              </button>
            </label>
            <button
              type="button"
              class="map-search-filter"
              id="map-filter-btn"
              aria-label="Filtres"
            >
              ${renderNavIcon('filter', { strokeWidth: 1.75, width: 16, height: 16 })}
              <span class="act-filter-badge hidden" aria-hidden="true">0</span>
            </button>
          </div>
          <ul class="map-search-results hidden" id="map-search-results" role="listbox" aria-label="Résultats de recherche"></ul>
        </div>
        <div class="map-controls" id="map-controls"></div>
      </div>
    </section>
  </main>
`;
