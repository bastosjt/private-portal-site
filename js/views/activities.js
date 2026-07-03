export const ACTIVITIES_VIEW_HTML = `
  <header class="page-header">
    <button type="button" class="btn-menu" id="menu-toggle" aria-label="Ouvrir le menu">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="4" x2="20" y1="12" y2="12"/>
        <line x1="4" x2="20" y1="6" y2="6"/>
        <line x1="4" x2="20" y1="18" y2="18"/>
      </svg>
    </button>
    <div class="page-header-mobile-icon act-header-icon" data-theme="cyan" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 19V5"/><path d="M10 19V6.8"/><path d="M14 19v-7.8"/><path d="M18 5v4"/><path d="M18 19v-6"/><path d="M22 19V9"/><path d="M2 19V9a4 4 0 0 1 4-4c2 0 4 1.33 6 4s4 4 6 4a4 4 0 1 0-3-6.65"/>
      </svg>
    </div>
    <div class="page-header-content">
      <h1 class="page-header-title" id="page-title">Activités</h1>
      <p class="page-header-sub" id="page-header-sub">-</p>
    </div>
  </header>

  <main class="page-content activities-page" data-theme="cyan">
    <section class="act-hero hidden" aria-labelledby="daily-heading" id="daily-hero">
      <article class="act-feature-card" data-theme="cyan" id="daily-card">
        <div class="act-feature-inner is-loading" id="daily-inner">
          <div class="skel-block skel-block--daily-title skel-shimmer" aria-hidden="true"></div>
          <div class="skel-block skel-block--daily-meta skel-shimmer" aria-hidden="true"></div>
        </div>
      </article>
    </section>

    <div class="act-grid act-grid--solo">
      <section class="act-grid-card" aria-label="Pioche au hasard">
        <div class="act-box act-dice-box" data-theme="cyan">
          <span class="cat-panel-accent" aria-hidden="true"></span>
          <div class="act-box-body act-dice-body">
            <div class="act-dice-result" id="dice-result" aria-live="polite">
              <p class="act-dice-result-label">Toujours pas d'idée ?</p>
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

    <section class="act-list-section act-cat-panel" data-theme="cyan" aria-labelledby="list-heading">
      <span class="cat-panel-accent" aria-hidden="true"></span>
      <div class="section-head">
        <div>
          <h2 id="list-heading">Toutes nos idées</h2>
          <p id="list-sub">Votre liste complète</p>
        </div>
      </div>
      <div class="act-list-toolbar" id="act-list-toolbar"></div>
      <ul class="act-list is-loading" id="activities-list"></ul>
    </section>
  </main>
`;
