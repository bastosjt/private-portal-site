import { getCategoryById } from '../../config.js';
import { renderListMapViewBlock } from '../shared/listMapSection.js';
import {
  renderCategoryListPageView,
  renderListSection,
} from '../shared/listPageTemplate.js';

const THEME = getCategoryById('restaurants')?.theme || 'rose';

const LIST_MAP_BLOCK = renderListMapViewBlock({
  prefix: 'restaurants',
  viewSwitchId: 'restaurants-view-switch',
  viewListBtnId: 'restaurants-view-list',
  viewMapBtnId: 'restaurants-view-map',
  listPanelId: 'restaurants-list-panel',
  mapPanelId: 'restaurants-map-panel',
  listId: 'restaurants-list',
  mapAriaLabel: 'Carte des restaurants',
  fitAllAriaLabel: 'Voir tous les restaurants',
  emptyHint: 'Ajoutez une adresse à vos restaurants pour les voir ici.',
});

export const RESTAURANTS_VIEW_HTML = renderCategoryListPageView({
  theme: THEME,
  listSectionHtml: renderListSection({
    listHeading: 'Toutes nos adresses',
    listSub: 'Votre liste complète',
    body: LIST_MAP_BLOCK,
  }),
});
