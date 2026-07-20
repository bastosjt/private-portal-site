import { getCategoryById } from '../../config.js';
import { renderListMapViewBlock } from '../shared/listMapSection.js';
import {
  renderCategoryListPageView,
  renderListPageHeader,
  renderListSection,
} from '../shared/listPageTemplate.js';

const THEME = getCategoryById('activities')?.theme || 'cyan';

const MENU_ICON = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="4" x2="20" y1="12" y2="12"/>
        <line x1="4" x2="20" y1="6" y2="6"/>
        <line x1="4" x2="20" y1="18" y2="18"/>
      </svg>
    `;

const MOBILE_ICON = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 19V5"/><path d="M10 19V6.8"/><path d="M14 19v-7.8"/><path d="M18 5v4"/><path d="M18 19v-6"/><path d="M22 19V9"/><path d="M2 19V9a4 4 0 0 1 4-4c2 0 4 1.33 6 4s4 4 6 4a4 4 0 1 0-3-6.65"/>
      </svg>
    `;

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
  headerHtml: renderListPageHeader({
    theme: THEME,
    menuIconHtml: MENU_ICON,
    mobileIconHtml: MOBILE_ICON,
    pageTitle: 'Activités',
  }),
  listSectionHtml: renderListSection({
    listHeading: 'Toutes nos idées',
    listSub: 'Votre liste complète',
    body: LIST_MAP_BLOCK,
  }),
});
