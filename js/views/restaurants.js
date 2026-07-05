import { getCategoryById } from '../config.js';
import { renderNavIcon } from '../utils/lucide-icon.js';

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
      <div class="act-cat-panel">
        <span class="cat-panel-accent" aria-hidden="true"></span>
        <div class="act-list-toolbar" id="act-list-toolbar"></div>
        <ul class="act-list is-loading" id="restaurants-list"></ul>
      </div>
    </section>
  </main>
`;
