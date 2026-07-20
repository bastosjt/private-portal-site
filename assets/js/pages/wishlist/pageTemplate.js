import { getCategoryById } from '../../config.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';
import {
  renderCategoryListPageView,
  renderListPageHeader,
  renderListSection,
} from '../shared/listPageTemplate.js';

const THEME = getCategoryById('wishlist')?.theme || 'pink';

const WISHLIST_LIST_BODY = `
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
`;

export const WISHLIST_VIEW_HTML = renderCategoryListPageView({
  theme: THEME,
  pageRootClass: 'activities-page wishlist-page',
  includePick: false,
  headerHtml: renderListPageHeader({
    theme: THEME,
    menuIconHtml: renderNavIcon('menu', { strokeWidth: 1.75 }),
    mobileIconHtml: renderNavIcon('wishlist', { strokeWidth: 2 }),
    pageTitle: 'Wishlist',
  }),
  listSectionHtml: renderListSection({
    listHeading: 'Toutes vos envies',
    listSub: 'Votre liste complète',
    body: WISHLIST_LIST_BODY,
  }),
});
