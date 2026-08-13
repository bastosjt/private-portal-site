import { formatListItemPrice, hasListItemPrice } from '../../lib/price-format.js';

/** Ligne meta « champ · champ » dans une liste. */
export function createDotJoinedListMetaRenderer({ getParts, fallback = '' }) {
  function getMetaLine(item, ctx) {
    const parts = getParts(item, ctx).filter(Boolean);
    return parts.join(' · ') || fallback;
  }

  function renderListMeta(item, ctx) {
    const line = getMetaLine(item, ctx);
    if (!line) return '';
    return `<p class="act-list-meta">${ctx.escapeHtml(line)}</p>`;
  }

  return { getMetaLine, renderListMeta };
}

export function renderRestaurantListMeta(item, { escapeHtml, getFieldLabel }) {
  const type = item.type ? escapeHtml(getFieldLabel('type', item.type)) : 'Restaurant';
  const cuisine = item.cuisine ? escapeHtml(getFieldLabel('cuisine', item.cuisine)) : '';
  const price = hasListItemPrice(item) ? escapeHtml(formatListItemPrice(item)) : '';
  const hasSub = Boolean(cuisine || price);

  return `
    <div class="act-list-meta act-list-meta--restaurant">
      <span class="act-list-meta-type">${type}</span>
      ${hasSub ? `
        <span class="act-list-meta-sub">
          ${cuisine ? `<span class="act-list-meta-cuisine">${cuisine}</span>` : ''}
          ${price ? `<span class="act-list-meta-price">${price}</span>` : ''}
        </span>
      ` : ''}
    </div>
  `;
}
