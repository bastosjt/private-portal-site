import { getCategoryById } from '../../config.js';

const THEME = getCategoryById('activities')?.theme || 'cyan';

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
      <div class="act-view-switch" role="tablist" aria-label="Mode d'affichage" id="activities-view-switch">
        <button type="button" class="act-view-switch-btn is-active" role="tab" id="activities-view-list" aria-selected="true" aria-controls="activities-list-panel" data-view="list">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/>
          </svg>
          <span>Liste</span>
        </button>
        <button type="button" class="act-view-switch-btn" role="tab" id="activities-view-map" aria-selected="false" aria-controls="activities-map-panel" data-view="map">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/>
            <path d="M15 5.764v15"/><path d="M9 3.236v15"/>
          </svg>
          <span>Carte</span>
        </button>
      </div>
      <div class="act-view-panel" id="activities-list-panel" role="tabpanel" aria-labelledby="activities-view-list">
        <div class="act-cat-panel">
          <span class="cat-panel-accent" aria-hidden="true"></span>
          <div class="act-list-toolbar" id="act-list-toolbar"></div>
          <ul class="act-list is-loading" id="activities-list"></ul>
        </div>
      </div>
      <div class="act-view-panel hidden" id="activities-map-panel" role="tabpanel" aria-labelledby="activities-view-map" hidden>
        <div class="act-cat-panel act-cat-panel--map">
          <span class="cat-panel-accent" aria-hidden="true"></span>
          <div class="act-map-placeholder">
            <span class="act-map-placeholder-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/>
                <path d="M15 5.764v15"/><path d="M9 3.236v15"/>
              </svg>
            </span>
            <p class="act-map-placeholder-title">Carte bientôt disponible</p>
            <p class="act-map-placeholder-text">Vos activités s'afficheront ici sur une carte interactive.</p>
          </div>
        </div>
      </div>
    </section>
  </main>
`;
