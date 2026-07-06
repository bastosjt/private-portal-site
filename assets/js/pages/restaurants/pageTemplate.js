import { getCategoryById } from '../../config.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';

const THEME = getCategoryById('restaurants')?.theme || 'rose';

export const RESTAURANTS_VIEW_HTML = `
  <header class="page-header page-header--themed page-header--activities" data-theme="${THEME}">
    <button type="button" class="btn-menu" id="menu-toggle" aria-label="Ouvrir le menu">
      ${renderNavIcon('menu', { strokeWidth: 1.75 })}
    </button>
    <div class="page-header-mobile-icon" data-theme="${THEME}" aria-hidden="true">
      ${renderNavIcon('restaurant', { strokeWidth: 2 })}
    </div>
    <div class="page-header-content">
      <h1 class="page-header-title" id="page-title">Restaurants</h1>
      <p class="page-header-sub" id="page-header-sub">-</p>
    </div>
  </header>

  <main class="page-content activities-page" data-theme="${THEME}">
    <section class="act-hero hidden" aria-labelledby="daily-heading" id="daily-hero">
      <article class="act-feature-card" data-theme="${THEME}" id="daily-card">
        <div class="act-feature-inner is-loading" id="daily-inner">
          <div class="skel-block skel-block--daily-title skel-shimmer" aria-hidden="true"></div>
          <div class="skel-block skel-block--daily-meta skel-shimmer" aria-hidden="true"></div>
        </div>
      </article>
    </section>

    <div class="act-grid act-grid--solo">
      <section class="act-grid-card" aria-label="Pioche au hasard">
        <div class="act-box act-dice-box" data-theme="${THEME}">
          <span class="cat-panel-accent" aria-hidden="true"></span>
          <div class="act-box-body act-dice-body">
            <div class="act-dice-result" id="dice-result" aria-live="polite">
              <p class="act-dice-result-label">Pas d'inspiration ?</p>
              <p class="act-dice-result-name">Un clic et c'est réglé</p>
            </div>
            <p class="act-dice-quota" id="dice-quota">2 pioches disponibles aujourd'hui</p>
            <button type="button" class="act-dice-btn" id="dice-roll-btn">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/>
              </svg>
              Au pif !
            </button>
          </div>
        </div>
      </section>
    </div>

    <section class="act-list-section" aria-labelledby="list-heading">
      <div class="section-head">
        <div>
          <h2 id="list-heading">Toutes nos adresses</h2>
          <p id="list-sub">Votre liste complète</p>
        </div>
      </div>
      <div class="act-view-switch" role="tablist" aria-label="Mode d'affichage" id="restaurants-view-switch">
        <button type="button" class="act-view-switch-btn is-active" role="tab" id="restaurants-view-list" aria-selected="true" aria-controls="restaurants-list-panel" data-view="list">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/>
          </svg>
          <span>Liste</span>
        </button>
        <button type="button" class="act-view-switch-btn" role="tab" id="restaurants-view-map" aria-selected="false" aria-controls="restaurants-map-panel" data-view="map">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/>
            <path d="M15 5.764v15"/><path d="M9 3.236v15"/>
          </svg>
          <span>Carte</span>
        </button>
      </div>
      <div class="act-view-panel" id="restaurants-list-panel" role="tabpanel" aria-labelledby="restaurants-view-list">
        <div class="act-cat-panel">
          <span class="cat-panel-accent" aria-hidden="true"></span>
          <div class="act-list-toolbar" id="act-list-toolbar"></div>
          <ul class="act-list is-loading" id="restaurants-list"></ul>
        </div>
      </div>
      <div class="act-view-panel hidden" id="restaurants-map-panel" role="tabpanel" aria-labelledby="restaurants-view-map" hidden>
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
            <p class="act-map-placeholder-text">Vos adresses s'afficheront ici sur une carte interactive.</p>
          </div>
        </div>
      </div>
    </section>
  </main>
`;
