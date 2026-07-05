import { BASE_THEME } from '../config.js';

export const HOME_VIEW_HTML = `
  <header class="page-header page-header--home" data-theme="${BASE_THEME}">
    <button type="button" class="btn-menu" id="menu-toggle" aria-label="Ouvrir le menu">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="4" x2="20" y1="12" y2="12"/>
        <line x1="4" x2="20" y1="6" y2="6"/>
        <line x1="4" x2="20" y1="18" y2="18"/>
      </svg>
    </button>
    <div class="page-header-mobile-icon" data-theme="${BASE_THEME}" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
    </div>
    <div class="page-header-content">
      <h1 class="page-header-title" id="page-greeting">Bonjour</h1>
      <p class="page-header-sub" id="page-header-sub">-</p>
    </div>
  </header>

  <main class="page-content home-page" data-theme="${BASE_THEME}">
    <section class="home-hero">
      <article class="days-card hero-days" data-theme="love" aria-labelledby="days-heading">
        <div class="days-card-inner">
          <div class="days-card-body">
            <div class="days-card-content">
              <p class="days-story-eyebrow" id="days-heading">
                <span class="days-story-eyebrow-dot" aria-hidden="true"></span>
                Notre histoire
              </p>

              <div class="days-story-main">
                <span class="days-count" id="days-count" aria-label="Nombre de jours">0</span>
                <p class="days-label" id="days-label">jours ensemble</p>
              </div>

              <div class="days-story-since">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                  <line x1="16" x2="16" y1="2" y2="6"/>
                  <line x1="8" x2="8" y1="2" y2="6"/>
                  <line x1="3" x2="21" y1="10" y2="10"/>
                </svg>
                <span id="days-since">-</span>
              </div>
            </div>

            <div class="hero-scene" aria-hidden="true">
              <div class="scene-stage">
                <div class="scene-ring scene-ring--1"></div>
                <div class="scene-ring scene-ring--2"></div>
                <div class="scene-ring scene-ring--3"></div>
                <div class="scene-heart-ripples" aria-hidden="true">
                  <span class="scene-heart-ripple"></span>
                </div>
                <div class="scene-core">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                  </svg>
                </div>
                <div class="scene-orb scene-orb--1"></div>
                <div class="scene-orb scene-orb--2"></div>
                <div class="scene-orb scene-orb--3"></div>
              </div>
            </div>
          </div>
          <div class="days-card-glow" aria-hidden="true"></div>
        </div>
      </article>
    </section>

    <section class="home-hub" id="home-hub" aria-label="Ce soir"></section>

    <section class="stats-section" aria-labelledby="stats-heading">
      <div class="section-head">
        <div>
          <h2 id="stats-heading">Résumé global</h2>
          <p><strong id="stats-total">0</strong> idées enregistrées au total</p>
        </div>
      </div>
      <div class="stats-grid is-loading" id="stats-grid"></div>
    </section>

    <section class="recent-sections-wrap" aria-labelledby="recent-heading">
      <div class="section-head">
        <div>
          <h2 id="recent-heading">Suggestions récentes</h2>
          <p>Dernières idées par catégorie</p>
        </div>
      </div>
      <div class="recent-sections is-loading" id="recent-sections"></div>
    </section>
  </main>
`;
