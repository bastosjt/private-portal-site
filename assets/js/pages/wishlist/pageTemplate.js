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

  <main class="page-content activities-page wishlist-page" data-theme="${THEME}">
    <section class="act-list-section" aria-labelledby="list-heading">
      <div class="section-head">
        <div>
          <h2 id="list-heading">Toutes vos envies</h2>
          <p id="list-sub">Votre liste complète</p>
        </div>
      </div>

      <div class="act-view-panel" id="wishlist-list-panel">
        <div class="act-cat-panel">
          <span class="cat-panel-accent" aria-hidden="true"></span>

          <div class="wishlist-search" id="wishlist-search">
            <label class="wishlist-search-field" for="wishlist-search-input">
              <span class="wishlist-search-icon" aria-hidden="true">
                ${renderNavIcon('search', { strokeWidth: 1.75, width: 16, height: 16 })}
              </span>
              <input
                type="search"
                id="wishlist-search-input"
                class="wishlist-search-input"
                placeholder="Rechercher une envie…"
                autocomplete="off"
                enterkeyhint="search"
                aria-label="Rechercher dans la wishlist"
              />
              <button
                type="button"
                class="wishlist-search-clear hidden"
                id="wishlist-search-clear"
                aria-label="Effacer la recherche"
              >
                ${renderNavIcon('close', { strokeWidth: 2, width: 14, height: 14 })}
              </button>
            </label>
          </div>

          <div
            class="act-view-switch wishlist-author-switch"
            id="wishlist-status-segments"
            role="radiogroup"
            aria-label="Filtrer par personne"
          ></div>

          <div class="wishlist-toolbar-row">
            <div class="act-list-toolbar" id="act-list-toolbar"></div>
            <div class="wishlist-active-filters hidden" id="wishlist-active-filters" aria-label="Filtres actifs"></div>
          </div>

          <ul class="act-list is-loading" id="wishlist-list"></ul>
        </div>
      </div>
    </section>
  </main>
`;
