import { getCategoryById } from '../../config.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';
import { renderListMapViewBlock } from '../shared/listMapSection.js';
import {
  renderCategoryListPageView,
  renderListPageHeader,
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
  headerHtml: renderListPageHeader({
    theme: THEME,
    menuIconHtml: renderNavIcon('menu', { strokeWidth: 1.75 }),
    mobileIconHtml: renderNavIcon('travel', { strokeWidth: 2 }),
    pageTitle: 'Voyages',
  }),
  listSectionHtml: renderListSection({
    listHeading: 'Toutes nos destinations',
    listSub: 'Votre liste complète',
    body: LIST_MAP_BLOCK,
  }),
});
