import { getCategoryById } from '../../config.js';
import { renderListMapViewBlock } from '../shared/listMapSection.js';

const THEME = getCategoryById('activities')?.theme || 'cyan';

const LIST_MAP_BLOCK = renderListMapViewBlock({
  prefix: 'activities',
  viewSwitchId: 'activities-view-switch',
  viewListBtnId: 'activities-view-list',
  viewMapBtnId: 'activities-view-map',
  listPanelId: 'activities-list-panel',
  mapPanelId: 'activities-map-panel',
  listId: 'activities-list',
  mapAriaLabel: 'Carte des activités',
  fitAllAriaLabel: 'Voir toutes les activités',
  emptyHint: 'Ajoutez une adresse à vos activités pour les voir ici.',
});

export const ACTIVITIES_VIEW_HTML = `
  <header class="page-header page-header--themed page-header--activities" data-theme="${THEME}">
    <button type="button" class="btn-menu" id="menu-toggle" aria-label="Ouvrir le menu">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="4" x2="20" y1="12" y2="12"/>
        <line x1="4" x2="20" y1="6" y2="6"/>
        <line x1="4" x2="20" y1="18" y2="18"/>
      </svg>
    </button>
    <div class="page-header-mobile-icon" data-theme="${THEME}" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 19V5"/><path d="M10 19V6.8"/><path d="M14 19v-7.8"/><path d="M18 5v4"/><path d="M18 19v-6"/><path d="M22 19V9"/><path d="M2 19V9a4 4 0 0 1 4-4c2 0 4 1.33 6 4s4 4 6 4a4 4 0 1 0-3-6.65"/>
      </svg>
    </div>
    <div class="page-header-content">
      <h1 class="page-header-title" id="page-title">Activités</h1>
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
          <h2 id="list-heading">Toutes nos idées</h2>
          <p id="list-sub">Votre liste complète</p>
        </div>
      </div>
      ${LIST_MAP_BLOCK}
    </section>
  </main>
`;
