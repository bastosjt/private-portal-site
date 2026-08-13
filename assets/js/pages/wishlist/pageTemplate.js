import { getCategoryById } from '../../config.js';
import { renderListViewBlock } from '../shared/listMapSection.js';
import {
  renderCategoryListPageView,
  renderListSection,
} from '../shared/listPageTemplate.js';
import { createListOnlyPageDom } from '../shared/listPageDom.js';

const THEME = getCategoryById('wishlist')?.theme || 'pink';
const dom = createListOnlyPageDom('wishlist');

export const WISHLIST_VIEW_HTML = renderCategoryListPageView({
  theme: THEME,
  pageRootClass: 'activities-page wishlist-page',
  includePick: false,
  listSectionHtml: renderListSection({
    listHeading: 'Toutes vos envies',
    listSub: 'Votre liste complète',
    body: `
      <div
        class="act-view-switch wishlist-author-switch"
        id="wishlist-status-segments"
        role="radiogroup"
        aria-label="Filtrer par personne"
      ></div>
      ${renderListViewBlock({
        prefix: 'wishlist',
        listPanelId: dom.listPanelId,
        listId: dom.listId,
      })}
    `,
  }),
});
