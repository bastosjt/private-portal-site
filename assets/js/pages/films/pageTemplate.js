import { getCategoryById } from '../../config.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';
import {
  renderCategoryListPageView,
  renderListOnlyPanel,
  renderListPageHeader,
  renderListSection,
} from '../shared/listPageTemplate.js';

const THEME = getCategoryById('movies')?.theme || 'violet';

export const FILMS_VIEW_HTML = renderCategoryListPageView({
  theme: THEME,
  headerHtml: renderListPageHeader({
    theme: THEME,
    menuIconHtml: renderNavIcon('menu', { strokeWidth: 1.75 }),
    mobileIconHtml: renderNavIcon('film', { strokeWidth: 2 }),
    pageTitle: 'Films &amp; Séries',
  }),
  listSectionHtml: renderListSection({
    listHeading: 'Tous nos films &amp; séries',
    listSub: 'Votre liste complète',
    body: renderListOnlyPanel({
      listPanelId: 'films-list-panel',
      listId: 'films-list',
    }),
  }),
});
