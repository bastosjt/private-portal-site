import { getCategoryById } from '../../config.js';
import { renderListMapViewBlock } from '../shared/listMapSection.js';
import {
  renderCategoryListPageView,
  renderListSection,
} from '../shared/listPageTemplate.js';

const THEME = getCategoryById('activities')?.theme || 'cyan';

const LIST_MAP_BLOCK = renderListMapViewBlock({
  prefix: 'activities',
  viewSwitchId: 'activities-view-switch',
  viewListBtnId: 'activities-view-list',
  viewMapBtnId: 'activities-view-map',
  listPanelId: 'activities-list-panel',
  mapPanelId: 'activities-map-panel',
  listId: 'activities-list',
  mapAriaLabel: 'Carte des activités',
  fitAllAriaLabel: 'Voir toutes les activités',
  emptyHint: 'Ajoutez une adresse à vos activités pour les voir ici.',
});

export const ACTIVITIES_VIEW_HTML = renderCategoryListPageView({
  theme: THEME,
  listSectionHtml: renderListSection({
    listHeading: 'Toutes nos idées',
    listSub: 'Votre liste complète',
    body: LIST_MAP_BLOCK,
  }),
});
