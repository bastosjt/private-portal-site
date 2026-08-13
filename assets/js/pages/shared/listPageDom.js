/** IDs DOM standard pour une page liste + carte (restaurants, activités, …). */
export function createGeoListPageDom(prefix) {
  return {
    listId: `${prefix}-list`,
    listPanelId: `${prefix}-list-panel`,
    mapPanelId: `${prefix}-map-panel`,
    viewSwitchId: `${prefix}-view-switch`,
    viewListBtnId: `${prefix}-view-list`,
    viewMapBtnId: `${prefix}-view-map`,
  };
}

/** IDs DOM pour une page liste seule (films, wishlist, …). */
export function createListOnlyPageDom(prefix) {
  return {
    listId: `${prefix}-list`,
    listPanelId: `${prefix}-list-panel`,
  };
}
