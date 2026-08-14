function withLayoutPanels(prefix, baseListId, suffix = '') {
  const part = suffix ? `-${suffix}` : '';
  return {
    layoutViewportId: `${prefix}-layout-viewport${part}`,
    layoutPanels: {
      list: {
        panelId: `${prefix}-layout-list-panel${part}`,
        listId: baseListId,
        layout: 'list',
      },
      grid: {
        panelId: `${prefix}-layout-grid-panel${part}`,
        listId: `${baseListId}-grid`,
        layout: 'grid',
      },
    },
  };
}

/** IDs DOM standard pour une page liste + carte (restaurants, activités, …). */
export function createGeoListPageDom(prefix) {
  const listId = `${prefix}-list`;
  return {
    listId,
    listPanelId: `${prefix}-list-panel`,
    mapPanelId: `${prefix}-map-panel`,
    viewSwitchId: `${prefix}-view-switch`,
    viewListBtnId: `${prefix}-view-list`,
    viewMapBtnId: `${prefix}-view-map`,
    viewportId: `${prefix}-map-viewport`,
    ...withLayoutPanels(prefix, listId),
  };
}

/** IDs DOM pour une page liste seule (films, wishlist, …). */
export function createListOnlyPageDom(prefix) {
  const listId = `${prefix}-list`;
  return {
    listId,
    listPanelId: `${prefix}-list-panel`,
    viewportId: `${prefix}-map-viewport`,
    ...withLayoutPanels(prefix, listId),
  };
}

/** DOM wishlist — deux panneaux auteur (moi / partenaire). */
export function createWishlistPageDom(prefix = 'wishlist') {
  const mineListId = `${prefix}-list-mine`;
  const partnerListId = `${prefix}-list-partner`;

  return {
    listId: mineListId,
    listPanelId: `${prefix}-list-panel-mine`,
    viewportId: `${prefix}-map-viewport`,
    viewSwitchId: `${prefix}-status-segments`,
    authorPanels: {
      mine: {
        panelId: `${prefix}-list-panel-mine`,
        listId: mineListId,
        ...withLayoutPanels(prefix, mineListId, 'mine'),
      },
      partner: {
        panelId: `${prefix}-list-panel-partner`,
        listId: partnerListId,
        ...withLayoutPanels(prefix, partnerListId, 'partner'),
      },
    },
  };
}
