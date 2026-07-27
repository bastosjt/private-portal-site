import { getCategoryById } from '../../config.js';
import {
  renderCategoryListPageView,
  renderListOnlyPanel,
  renderListSection,
} from '../shared/listPageTemplate.js';

const THEME = getCategoryById('movies')?.theme || 'violet';

export const FILMS_VIEW_HTML = renderCategoryListPageView({
  theme: THEME,
  listSectionHtml: renderListSection({
    listHeading: 'Tous nos films &amp; séries',
    listSub: 'Votre liste complète',
    body: renderListOnlyPanel({
      listPanelId: 'films-list-panel',
      listId: 'films-list',
    }),
  }),
});
