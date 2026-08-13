const LAYOUT_LIST_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect width="7" height="7" x="3" y="3" rx="1"/>
    <rect width="7" height="7" x="3" y="14" rx="1"/>
    <path d="M14 4h7"/>
    <path d="M14 9h7"/>
    <path d="M14 15h7"/>
    <path d="M14 20h7"/>
  </svg>
`;

const LAYOUT_GRID_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect width="7" height="7" x="3" y="3" rx="1"/>
    <rect width="7" height="7" x="14" y="3" rx="1"/>
    <rect width="7" height="7" x="14" y="14" rx="1"/>
    <rect width="7" height="7" x="3" y="14" rx="1"/>
  </svg>
`;

export function renderListToolbarHtml({ filterAriaLabel, escapeHtml }) {
  return `
    <button type="button" class="act-filter-btn" id="act-filter-btn" aria-label="${escapeHtml(filterAriaLabel)}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
      </svg>
      <span>Filtres</span>
      <span class="act-filter-badge hidden" aria-hidden="true">0</span>
    </button>
    <div class="act-layout-switch" role="group" aria-label="Mode d'affichage">
      <button type="button" class="act-filter-btn act-layout-btn is-active" id="act-layout-list-btn" aria-label="Vue liste" aria-pressed="true">
        ${LAYOUT_LIST_ICON}
      </button>
      <button type="button" class="act-filter-btn act-layout-btn" id="act-layout-grid-btn" aria-label="Vue grille" aria-pressed="false">
        ${LAYOUT_GRID_ICON}
      </button>
    </div>
  `;
}
