import { MAP_THEME } from '../../config.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';

const THEME = MAP_THEME;

export const MAP_VIEW_HTML = `
  <header class="page-header page-header--themed" data-theme="${THEME}">
    <button type="button" class="btn-menu" id="menu-toggle" aria-label="Ouvrir le menu">
      ${renderNavIcon('menu', { strokeWidth: 1.75 })}
    </button>
    <div class="page-header-mobile-icon" data-theme="${THEME}" aria-hidden="true">
      ${renderNavIcon('map', { strokeWidth: 1.75 })}
    </div>
    <div class="page-header-content">
      <h1 class="page-header-title">Carte interactive</h1>
      <p class="page-header-sub" id="map-header-sub">Activités, restaurants et voyages</p>
    </div>
  </header>

  <main class="page-content map-page" data-theme="${THEME}">
    <section class="act-cat-panel act-cat-panel--map map-panel">
      <span class="cat-panel-accent" aria-hidden="true"></span>
      <div class="map-panel-body">
        <div id="interactive-map" class="map-canvas" role="application" aria-label="Carte interactive"></div>
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
