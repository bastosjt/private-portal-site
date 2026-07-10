import { getCategoryById } from '../../config.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';

const THEME = getCategoryById('wishlist')?.theme || 'pink';

export const WISHLIST_VIEW_HTML = `
  <header class="page-header page-header--themed page-header--activities" data-theme="${THEME}">
    <button type="button" class="btn-menu" id="menu-toggle" aria-label="Ouvrir le menu">
      ${renderNavIcon('menu', { strokeWidth: 1.75 })}
    </button>
    <div class="page-header-mobile-icon" data-theme="${THEME}" aria-hidden="true">
      ${renderNavIcon('wishlist', { strokeWidth: 2 })}
    </div>
    <div class="page-header-content">
      <h1 class="page-header-title" id="page-title">Wishlist</h1>
      <p class="page-header-sub" id="page-header-sub">-</p>
    </div>
  </header>

  <main class="page-content activities-page" data-theme="${THEME}">
    <section class="act-list-section" aria-label="Liste wishlist">
      <div class="act-view-panel" id="wishlist-list-panel">
        <div class="act-cat-panel">
          <span class="cat-panel-accent" aria-hidden="true"></span>
          <div class="act-list-toolbar" id="act-list-toolbar"></div>
          <ul class="act-list is-loading" id="wishlist-list"></ul>
        </div>
      </div>
    </section>
  </main>
`;
