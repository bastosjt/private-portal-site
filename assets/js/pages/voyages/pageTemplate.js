import { getCategoryById } from '../../config.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';
import { renderListMapViewBlock } from '../shared/listMapSection.js';

const THEME = getCategoryById('travels')?.theme || 'blue';

const LIST_MAP_BLOCK = renderListMapViewBlock({
  prefix: 'voyages',
  viewSwitchId: 'voyages-view-switch',
  viewListBtnId: 'voyages-view-list',
  viewMapBtnId: 'voyages-view-map',
  listPanelId: 'voyages-list-panel',
  mapPanelId: 'voyages-map-panel',
  listId: 'voyages-list',
  mapAriaLabel: 'Carte des voyages',
  fitAllAriaLabel: 'Voir toutes les destinations',
  emptyHint: 'Ajoutez une adresse à vos voyages pour les voir ici.',
});

export const VOYAGES_VIEW_HTML = `
  <header class="page-header page-header--themed page-header--activities" data-theme="${THEME}">
    <button type="button" class="btn-menu" id="menu-toggle" aria-label="Ouvrir le menu">
      ${renderNavIcon('menu', { strokeWidth: 1.75 })}
    </button>
    <div class="page-header-mobile-icon" data-theme="${THEME}" aria-hidden="true">
      ${renderNavIcon('travel', { strokeWidth: 2 })}
    </div>
    <div class="page-header-content">
      <h1 class="page-header-title" id="page-title">Voyages</h1>
      <p class="page-header-sub" id="page-header-sub">-</p>
    </div>
  </header>

  <main class="page-content activities-page" data-theme="${THEME}">
    <section class="act-pick-wrap hidden" id="act-pick-wrap" aria-label="Pioche du jour">
      <article class="act-pick-card" data-theme="${THEME}">
        <span class="cat-panel-accent" aria-hidden="true"></span>
        <div class="act-pick-inner is-loading" id="act-pick-inner">
          <header class="act-pick-head">
            <div class="act-pick-head-copy">
              <p class="act-pick-eyebrow">Pioche du jour</p>
              <p class="act-pick-quota" id="act-pick-quota"></p>
            </div>
            <div class="act-pick-chances" id="act-pick-chances" aria-hidden="true"></div>
          </header>
          <div class="act-pick-body" id="act-pick-body" aria-live="polite"></div>
          <footer class="act-pick-foot" id="act-pick-foot">
            <button type="button" class="act-pick-btn" id="dice-roll-btn">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/>
              </svg>
              <span id="act-pick-btn-label">Au pif !</span>
            </button>
          </footer>
        </div>
      </article>
    </section>

    <section class="act-list-section" aria-labelledby="list-heading">
      <div class="section-head">
        <div>
          <h2 id="list-heading">Toutes nos destinations</h2>
          <p id="list-sub">Votre liste complète</p>
        </div>
      </div>
      ${LIST_MAP_BLOCK}
    </section>
  </main>
`;
