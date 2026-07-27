import { getCategoryById } from '../../config.js';
import { renderListMapViewBlock } from '../shared/listMapSection.js';
import {
  renderCategoryListPageView,
  renderListSection,
} from '../shared/listPageTemplate.js';

const THEME = getCategoryById('travels')?.theme || 'blue';

const LIST_MAP_BLOCK = renderListMapViewBlock({
  prefix: 'voyages',
  viewSwitchId: 'voyages-view-switch',
  viewListBtnId: 'voyages-view-list',
  viewMapBtnId: 'voyages-view-map',
  listPanelId: 'voyages-list-panel',
  mapPanelId: 'voyages-map-panel',
  listId: 'voyages-list',
  mapAriaLabel: 'Carte des voyages',
  fitAllAriaLabel: 'Voir toutes les destinations',
  emptyHint: 'Ajoutez une adresse à vos voyages pour les voir ici.',
});

export const VOYAGES_VIEW_HTML = renderCategoryListPageView({
  theme: THEME,
  includePick: false,
  listSectionHtml: renderListSection({
    listHeading: 'Nos destinations',
    listSub: 'Activités et adresses regroupées par voyage',
    body: LIST_MAP_BLOCK,
  }),
});
