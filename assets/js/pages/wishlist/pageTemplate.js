import { getCategoryById } from '../../config.js';
import { renderAuthorListViewBlock } from '../shared/listMapSection.js';
import {
  renderCategoryListPageView,
  renderListSection,
} from '../shared/listPageTemplate.js';
import { createWishlistPageDom } from '../shared/listPageDom.js';

const THEME = getCategoryById('wishlist')?.theme || 'pink';
const dom = createWishlistPageDom('wishlist');

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
        id="${dom.viewSwitchId}"
        role="radiogroup"
        aria-label="Filtrer par personne"
      ></div>
      ${renderAuthorListViewBlock({
        prefix: 'wishlist',
        panels: [
          {
            key: 'mine',
            panelId: dom.authorPanels.mine.panelId,
            listId: dom.authorPanels.mine.listId,
            active: true,
          },
          {
            key: 'partner',
            panelId: dom.authorPanels.partner.panelId,
            listId: dom.authorPanels.partner.listId,
            active: false,
          },
        ],
      })}
    `,
  }),
});
