import { BASE_THEME } from '../../config.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';
import { EXPLORER_SECTION_HTML } from '../../ui/explorer-section.js';

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
      ${renderNavIcon('home')}
    </div>
    <div class="page-header-content">
      <h1 class="page-header-title" id="page-greeting">Bonjour</h1>
      <p class="page-header-sub" id="page-header-sub">-</p>
    </div>
  </header>

  <main class="page-content home-page" data-theme="${BASE_THEME}">
    <section class="home-hero">
      <article class="days-card hero-days" data-theme="love" aria-labelledby="days-count days-label">
        <div class="days-card-inner">
          <div class="love-hearts-field love-hearts-field--card days-story-love-hearts" id="days-story-love-hearts" aria-hidden="true"></div>
          <div class="days-card-body">
            <div class="days-card-content">
              <div class="days-story-main">
                <div class="days-stat-display">
                  <span class="days-count" id="days-count" aria-label="Nombre de jours">0</span>
                  <span class="days-stat-divider" aria-hidden="true"></span>
                  <p class="days-stat-label" id="days-label">
                    <span class="days-stat-label-unit">jours</span>
                    <span class="days-stat-label-word">ensemble</span>
                  </p>
                </div>
              </div>
            </div>

            <div class="days-story-since">
              <span class="days-story-since-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                  <line x1="16" x2="16" y1="2" y2="6"/>
                  <line x1="8" x2="8" y1="2" y2="6"/>
                  <line x1="3" x2="21" y1="10" y2="10"/>
                </svg>
              </span>
              <div class="days-story-since-copy">
                <span class="days-story-since-label">Depuis le</span>
                <span class="days-story-since-date" id="days-since">-</span>
              </div>
            </div>

            <div class="hero-scene">
              <div class="scene-stage">
                <div class="scene-ring scene-ring--1"></div>
                <div class="scene-ring scene-ring--2"></div>
                <div class="scene-ring scene-ring--3"></div>
                <div class="scene-heart-ripples" aria-hidden="true">
                  <span class="scene-heart-ripple love-ripple"></span>
                  <span class="scene-heart-ripple love-ripple"></span>
                  <span class="scene-heart-ripple love-ripple"></span>
                </div>
                <button type="button" class="scene-core" id="days-story-heart-trigger" aria-label="Réveiller les cœurs">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                  </svg>
                </button>
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

    <section class="home-nearby-section" aria-labelledby="home-nearby-heading">
      <div class="section-head">
        <div>
          <h2 id="home-nearby-heading">Autour de nous</h2>
          <p id="home-nearby-sub">Lieux enregistrés</p>
        </div>
      </div>
      <article class="home-nearby-card" data-theme="${BASE_THEME}">
        <span class="home-nearby-accent" aria-hidden="true"></span>
        <div class="home-nearby-inner is-loading" id="home-nearby-inner"></div>
      </article>
    </section>

    <section class="home-shortcuts-section" aria-labelledby="home-shortcuts-heading">
      <div class="section-head">
        <div>
          <h2 id="home-shortcuts-heading">Accès rapide</h2>
          <p id="home-shortcuts-sub">Trouver une idée</p>
        </div>
      </div>
      <div class="home-shortcuts" id="home-shortcuts"></div>
    </section>

    ${EXPLORER_SECTION_HTML}
  </main>
`;
