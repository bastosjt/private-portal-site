const LIST_TAB_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/>
  </svg>
`;

const MAP_TAB_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/>
    <path d="M15 5.764v15"/><path d="M9 3.236v15"/>
  </svg>
`;

const MAP_EMPTY_PIN_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
`;

/**
 * Options mapTab pour createListPageController.
 */
export function createMapTabOptions({
  prefix,
  countSingular,
  countPlural,
  emptyHint,
  mapListFilters,
}) {
  return {
    canvasId: `${prefix}-map-canvas`,
    emptyId: `${prefix}-map-empty`,
    summaryId: `${prefix}-map-summary`,
    placesListId: `${prefix}-map-places`,
    placesScrollId: `${prefix}-map-places-scroll`,
    controlsId: `${prefix}-map-controls`,
    countSingular,
    countPlural,
    emptyHint,
    mapListFilters,
  };
}

/**
 * Onglets Liste/Carte + bloc filtres + panneaux liste/carte embarquée.
 */
export function renderListMapViewBlock({
  prefix,
  viewSwitchId,
  viewListBtnId,
  viewMapBtnId,
  listPanelId,
  mapPanelId,
  listId,
  mapAriaLabel,
  fitAllAriaLabel,
  emptyTitle = 'Aucune adresse géolocalisée',
  emptyHint,
  summaryDefault = 'Chargement…',
  fullMapLinkLabel = 'Carte complète',
}) {
  const mapBlockId = `${prefix}-map-block`;
  const mapViewportId = `${prefix}-map-viewport`;
  const mapCanvasId = `${prefix}-map-canvas`;
  const mapControlsId = `${prefix}-map-controls`;
  const mapEmptyId = `${prefix}-map-empty`;
  const mapPlacesScrollId = `${prefix}-map-places-scroll`;
  const mapPlacesId = `${prefix}-map-places`;
  const mapSummaryId = `${prefix}-map-summary`;

  return `
      <div class="act-view-switch" role="tablist" aria-label="Mode d'affichage" id="${viewSwitchId}">
        <button type="button" class="act-view-switch-btn is-active" role="tab" id="${viewListBtnId}" aria-selected="true" aria-controls="${listPanelId}" data-view="list">
          ${LIST_TAB_ICON}
          <span>Liste</span>
        </button>
        <button type="button" class="act-view-switch-btn" role="tab" id="${viewMapBtnId}" aria-selected="false" aria-controls="${mapPanelId}" data-view="map">
          ${MAP_TAB_ICON}
          <span>Carte</span>
        </button>
      </div>
      <div class="act-map-block" id="${mapBlockId}">
        <div class="act-list-toolbar-wrap">
          <div class="act-list-toolbar" id="act-list-toolbar"></div>
        </div>
        <div class="act-map-viewport" id="${mapViewportId}">
          <div class="act-view-panel" id="${listPanelId}" role="tabpanel" aria-labelledby="${viewListBtnId}">
            <div class="act-cat-panel">
              <span class="cat-panel-accent" aria-hidden="true"></span>
              <ul class="act-list is-loading" id="${listId}"></ul>
            </div>
          </div>
          <div class="act-view-panel hidden" id="${mapPanelId}" role="tabpanel" aria-labelledby="${viewMapBtnId}" hidden>
            <div class="act-cat-panel act-cat-panel--map">
              <span class="cat-panel-accent" aria-hidden="true"></span>
              <div class="act-category-map">
                <div class="act-category-map-body">
                  <div class="act-category-map-canvas" id="${mapCanvasId}" aria-label="${mapAriaLabel}"></div>
                  <div class="act-category-map-controls hidden" id="${mapControlsId}" hidden>
                    <button type="button" class="act-category-map-control" data-map-action="fit-all" aria-label="${fitAllAriaLabel}">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M15 3h6v6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/><path d="M9 21H3v-6"/>
                      </svg>
                    </button>
                    <button type="button" class="act-category-map-control" data-map-action="locate" aria-label="Centrer sur ma position">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    </button>
                  </div>
                  <div class="act-map-placeholder act-category-map-empty hidden" id="${mapEmptyId}" hidden>
                    <span class="act-map-placeholder-icon" aria-hidden="true">${MAP_EMPTY_PIN_ICON}</span>
                    <p class="act-map-placeholder-title">${emptyTitle}</p>
                    <p class="act-map-placeholder-text">${emptyHint}</p>
                  </div>
                </div>
                <div class="act-category-map-places-scroll hidden" id="${mapPlacesScrollId}" hidden>
                  <ul class="act-category-map-places" id="${mapPlacesId}" role="list"></ul>
                </div>
                <footer class="act-category-map-foot">
                  <p class="act-category-map-summary" id="${mapSummaryId}">${summaryDefault}</p>
                  <a href="#carte" class="act-category-map-link">${fullMapLinkLabel}</a>
                </footer>
              </div>
            </div>
          </div>
        </div>
      </div>
  `;
}
