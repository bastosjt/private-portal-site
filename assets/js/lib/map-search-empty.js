import { escapeHtml } from './escape-html.js';

export function renderMapSearchEmptyHtml(query, { showActions = true } = {}) {
  const trimmed = String(query || '').trim();
  const actionsHtml = showActions ? `
    <div class="map-search-empty-actions">
      <button type="button" class="map-search-empty-action" data-map-search-action="show-all">
        Voir tous les lieux
      </button>
      <button type="button" class="map-search-empty-action" data-map-search-action="enable-geoloc">
        Activer la géoloc
      </button>
    </div>
  ` : '';

  return `
    <li class="map-search-empty" role="status">
      <p class="map-search-empty-text">Aucun résultat pour « ${escapeHtml(trimmed)} »</p>
      ${actionsHtml}
    </li>
  `;
}
