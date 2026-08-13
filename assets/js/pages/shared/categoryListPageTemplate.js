import { getCategoryById } from '../../config.js';
import { renderListMapViewBlock, renderListViewBlock } from './listMapSection.js';
import {
  renderCategoryListPageView,
  renderListSection,
} from './listPageTemplate.js';
import { createGeoListPageDom, createListOnlyPageDom } from './listPageDom.js';

export function renderMapCategoryListPageView({
  categoryId,
  prefix,
  listHeading,
  mapAriaLabel,
  fitAllAriaLabel,
  emptyHint,
  themeFallback = 'cyan',
  listSub = 'Votre liste complète',
}) {
  const dom = createGeoListPageDom(prefix);
  const theme = getCategoryById(categoryId)?.theme || themeFallback;
  const body = renderListMapViewBlock({
    prefix,
    viewSwitchId: dom.viewSwitchId,
    viewListBtnId: dom.viewListBtnId,
    viewMapBtnId: dom.viewMapBtnId,
    listPanelId: dom.listPanelId,
    mapPanelId: dom.mapPanelId,
    listId: dom.listId,
    mapAriaLabel,
    fitAllAriaLabel,
    emptyHint,
  });

  return renderCategoryListPageView({
    theme,
    listSectionHtml: renderListSection({ listHeading, listSub, body }),
  });
}

export function renderListOnlyCategoryPageView({
  categoryId,
  prefix,
  listHeading,
  themeFallback = 'violet',
  listSub = 'Votre liste complète',
}) {
  const dom = createListOnlyPageDom(prefix);
  const theme = getCategoryById(categoryId)?.theme || themeFallback;

  return renderCategoryListPageView({
    theme,
    listSectionHtml: renderListSection({
      listHeading,
      listSub,
      body: renderListViewBlock({
        prefix,
        listPanelId: dom.listPanelId,
        listId: dom.listId,
      }),
    }),
  });
}
