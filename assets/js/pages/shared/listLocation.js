import { getMapsUrl } from '../../lib/item-location.js';

const PIN_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
`;

export function renderPinLocation(text, { mapsUrl = null, escapeHtml: esc, escapeHref = false }) {
  if (!text) return '';

  const safeText = esc(text);
  if (mapsUrl) {
    const href = escapeHref ? esc(mapsUrl) : mapsUrl;
    return `
      <a href="${href}" class="act-location" target="_blank" rel="noopener noreferrer">
        ${PIN_ICON}
        <span>${safeText}</span>
      </a>
    `;
  }

  return `
    <p class="act-location act-location--text">
      ${PIN_ICON}
      <span>${safeText}</span>
    </p>
  `;
}

export function renderGeoCategoryLocation(item, categoryId, { escapeHtml: esc, escapeHref = false }) {
  const text = categoryId === 'restaurants' ? item.adresse : item.localisation;
  if (!text) return '';

  return renderPinLocation(text, {
    mapsUrl: getMapsUrl(item, categoryId),
    escapeHtml: esc,
    escapeHref,
  });
}

const GLOBE_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
    <path d="M2 12h20"/>
  </svg>
`;

export function renderGlobeLocation(text, { escapeHtml: esc }) {
  if (!text) return '';

  return `
    <p class="act-location act-location--text">
      ${GLOBE_ICON}
      <span>${esc(text)}</span>
    </p>
  `;
}
