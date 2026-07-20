const DICE_BTN_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect width="18" height="18" x="3" y="3" rx="2"/>
    <path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/>
  </svg>
`;

export function renderListPageHeader({ theme, menuIconHtml, mobileIconHtml, pageTitle }) {
  return `
  <header class="page-header page-header--themed page-header--activities" data-theme="${theme}">
    <button type="button" class="btn-menu" id="menu-toggle" aria-label="Ouvrir le menu">
      ${menuIconHtml}
    </button>
    <div class="page-header-mobile-icon" data-theme="${theme}" aria-hidden="true">
      ${mobileIconHtml}
    </div>
    <div class="page-header-content">
      <h1 class="page-header-title" id="page-title">${pageTitle}</h1>
      <p class="page-header-sub" id="page-header-sub">-</p>
    </div>
  </header>
  `;
}

export function renderPickSection(theme) {
  return `
    <section class="act-pick-wrap hidden" id="act-pick-wrap" aria-label="Pioche du jour">
      <article class="act-pick-card" data-theme="${theme}">
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
              ${DICE_BTN_ICON}
              <span id="act-pick-btn-label">Au pif !</span>
            </button>
          </footer>
        </div>
      </article>
    </section>
  `;
}

export function renderListSection({ listHeading, listSub, body }) {
  return `
    <section class="act-list-section" aria-labelledby="list-heading">
      <div class="section-head">
        <div>
          <h2 id="list-heading">${listHeading}</h2>
          <p id="list-sub">${listSub}</p>
        </div>
      </div>
      ${body}
    </section>
  `;
}

export function renderListOnlyPanel({ listPanelId, listId }) {
  return `
      <div class="act-view-panel" id="${listPanelId}">
        <div class="act-cat-panel">
          <span class="cat-panel-accent" aria-hidden="true"></span>
          <div class="act-list-toolbar" id="act-list-toolbar"></div>
          <ul class="act-list is-loading" id="${listId}"></ul>
        </div>
      </div>
  `;
}

export function renderCategoryListPageView({
  theme,
  pageRootClass = 'activities-page',
  headerHtml,
  listSectionHtml,
  includePick = true,
}) {
  return `
  ${headerHtml}

  <main class="page-content ${pageRootClass}" data-theme="${theme}">
    ${includePick ? renderPickSection(theme) : ''}
    ${listSectionHtml}
  </main>
  `;
}
