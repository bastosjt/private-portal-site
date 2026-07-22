import { BASE_THEME } from '../../config.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';
import { EXPLORER_SECTION_HTML } from '../../ui/explorer-section.js';

export const EXPLORER_VIEW_HTML = `
  <header class="page-header page-header--themed" data-theme="${BASE_THEME}">
    <button type="button" class="btn-menu" id="menu-toggle" aria-label="Ouvrir le menu">
      ${renderNavIcon('menu', { strokeWidth: 1.75 })}
    </button>
    <div class="page-header-mobile-icon" data-theme="${BASE_THEME}" aria-hidden="true">
      ${renderNavIcon('layout-grid', { strokeWidth: 1.75 })}
    </div>
    <div class="page-header-content">
      <h1 class="page-header-title">Explorer</h1>
      <p class="page-header-sub">Parcourir par catégorie</p>
    </div>
  </header>

  <main class="page-content explorer-page home-page" data-theme="${BASE_THEME}">
    ${EXPLORER_SECTION_HTML}
  </main>
`;
