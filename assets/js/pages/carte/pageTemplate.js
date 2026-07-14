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
        <div class="map-controls" id="map-controls"></div>
      </div>
    </section>
  </main>
`;
