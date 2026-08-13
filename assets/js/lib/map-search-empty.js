import { escapeHtml } from './escape-html.js';

export function renderMapSearchEmptyHtml(query) {
  const trimmed = String(query || '').trim();
  return `
    <li class="map-search-empty" role="status">
      <p class="map-search-empty-text">Aucun résultat pour « ${escapeHtml(trimmed)} »</p>
    </li>
  `;
}
