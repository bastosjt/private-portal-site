import { escapeHtml } from '../lib/escape-html.js';
import { getMapsUrl } from '../lib/item-location.js';
import { findCachedItemById } from '../data/appDataCache.js';

const PIN_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
`;

export function renderDetailMediaBlock(mediaHtml, { slotHtml = '', cornerSlotHtml = '' } = {}) {
  return `
    <div class="act-detail-media-wrap">
      ${mediaHtml}
      ${slotHtml ? `<div class="act-detail-media-slot">${slotHtml}</div>` : ''}
      ${cornerSlotHtml ? `<div class="act-detail-media-slot act-detail-media-slot--corner">${cornerSlotHtml}</div>` : ''}
    </div>
  `;
}

export function renderDetailMediaIcon(iconHtml) {
  return `<span class="act-detail-media-icon" aria-hidden="true">${iconHtml}</span>`;
}

export function renderDetailMediaImage(imageUrl, { className = 'act-detail-media-image' } = {}) {
  if (!imageUrl) return '';
  const isGooglePlacePhoto = String(imageUrl).includes('places.googleapis.com');
  const referrerAttr = isGooglePlacePhoto ? '' : ' referrerpolicy="no-referrer"';
  return `<img
    class="${className}"
    src="${escapeHtml(imageUrl)}"
    alt=""
    loading="lazy"
    decoding="async"${referrerAttr}
  >`;
}

function renderDetailMediaStage({
  fallbackIconHtml = '',
  photoUrl = null,
  googleIcon = null,
  photoVisible = false,
  isLoading = false,
} = {}) {
  const stageClasses = [
    'act-detail-media-stage',
    photoVisible && photoUrl ? 'act-detail-media-stage--photo-visible' : '',
    isLoading ? 'act-detail-media-stage--loading' : '',
  ].filter(Boolean).join(' ');

  const layers = [];

  if (fallbackIconHtml) {
    layers.push(`<span class="act-detail-media-icon act-detail-media-layer" aria-hidden="true">${fallbackIconHtml}</span>`);
  }

  if (photoUrl) {
    layers.push(renderDetailMediaImage(photoUrl, {
      className: 'act-detail-media-image act-detail-media-layer',
    }));
  } else if (googleIcon?.maskUrl) {
    layers.push(renderDetailGooglePlaceIcon({
      ...googleIcon,
      layerClass: 'act-detail-media-layer',
    }));
  }

  return `<div class="${stageClasses}">${layers.join('')}</div>`;
}

export function revealDetailPlacePhoto(mediaWrapEl, photoUrl) {
  if (!mediaWrapEl || !photoUrl) return;

  const stage = mediaWrapEl.querySelector('.act-detail-media-stage');
  if (!stage) return;

  let img = stage.querySelector('.act-detail-media-image');
  if (!img) {
    stage.insertAdjacentHTML('beforeend', renderDetailMediaImage(photoUrl, {
      className: 'act-detail-media-image act-detail-media-layer',
    }));
    img = stage.querySelector('.act-detail-media-image');
  } else if (img.getAttribute('src') !== photoUrl) {
    img.src = photoUrl;
  }

  const reveal = () => {
    stage.classList.remove('act-detail-media-stage--loading');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        stage.classList.add('act-detail-media-stage--photo-visible');
      });
    });
  };

  if (img?.complete && img.naturalWidth > 0) {
    reveal();
    return;
  }

  img?.addEventListener('load', reveal, { once: true });
  img?.addEventListener('error', () => {
    stage.classList.remove('act-detail-media-stage--loading');
  }, { once: true });
}

export function renderDetailGooglePlaceIcon({
  maskUrl,
  backgroundColor = '#78909C',
  layerClass = '',
} = {}) {
  if (!maskUrl) return '';
  const safeMaskUrl = escapeHtml(maskUrl);
  const safeBackground = escapeHtml(backgroundColor);
  const extraClass = layerClass ? ` ${layerClass}` : '';

  return `
    <span
      class="act-detail-media-google-icon${extraClass}"
      style="--google-place-icon-bg: ${safeBackground};"
      aria-hidden="true"
    >
      <img class="act-detail-media-google-icon__mask" src="${safeMaskUrl}" alt="" referrerpolicy="no-referrer">
    </span>
  `;
}

export function renderDetailPlaceMedia(media, {
  fallbackIconHtml = '',
  photoVisible = false,
  isLoading = false,
} = {}) {
  const photoUrl = media?.type === 'photo' ? media.url : null;
  const googleIcon = media?.type === 'googleIcon' ? media : null;

  if (photoUrl || googleIcon || fallbackIconHtml) {
    return renderDetailMediaStage({
      fallbackIconHtml,
      photoUrl,
      googleIcon,
      photoVisible: photoVisible || Boolean(photoUrl),
      isLoading,
    });
  }

  return '';
}

export function renderDetailBadge(label, { className = '' } = {}) {
  if (!label) return '';
  const extraClass = className ? ` ${className}` : '';
  return `<span class="url-import-preview__price-badge${extraClass}">${escapeHtml(label)}</span>`;
}

export function renderDetailLinkBadge(rawUrl, label, { icon = PIN_ICON } = {}) {
  if (!rawUrl || !label) return '';
  const content = `${icon}<span>${escapeHtml(label)}</span>`;
  return `
    <a
      href="${escapeHtml(rawUrl)}"
      class="url-import-preview__price-badge act-detail-badge-link"
      target="_blank"
      rel="noopener noreferrer"
    >${content}</a>
  `;
}

export function renderDetailMetaRow(primaryHtml, secondaryHtml = '') {
  if (!primaryHtml && !secondaryHtml) return '';
  return `
    <div class="act-detail-meta-row">
      <div class="act-detail-meta-row__primary">${primaryHtml || ''}</div>
      ${secondaryHtml || ''}
    </div>
  `;
}

export function renderDetailBadgeRow(badgesHtml) {
  if (!badgesHtml) return '';
  return `<div class="act-detail-badge-row">${badgesHtml}</div>`;
}

export function renderDetailLocationBadge(item, categoryId, { escapeHtml: esc, escapeHref = false }) {
  const text = categoryId === 'restaurants' ? item.adresse : item.localisation;
  if (!text?.trim()) return '';

  const mapsUrl = getMapsUrl(item, categoryId);
  const safeText = esc(text.trim());
  const content = `${PIN_ICON}<span>${safeText}</span>`;

  if (mapsUrl) {
    const href = escapeHref ? esc(mapsUrl) : mapsUrl;
    return `
      <a
        href="${href}"
        class="url-import-preview__price-badge act-detail-badge-link"
        target="_blank"
        rel="noopener noreferrer"
      >${content}</a>
    `;
  }

  return `<span class="url-import-preview__price-badge act-detail-badge-link">${content}</span>`;
}

export function renderDetailTravelBadge(item) {
  if (!item?.travelId) return '';
  const travel = findCachedItemById('travels', item.travelId);
  if (!travel) return '';
  return renderDetailBadge(travel.localisation || travel.pays || 'Voyage');
}

export function createDetailListSelection(itemIdAttr) {
  let selectedRow = null;

  function setSelectedItem(itemId) {
    selectedRow?.classList.remove('is-selected');
    selectedRow = null;
    if (!itemId) return;

    const inner = document.querySelector(`[${itemIdAttr}="${CSS.escape(itemId)}"]`);
    selectedRow = inner?.closest('.act-list-item') || null;
    selectedRow?.classList.add('is-selected');
  }

  function getSelectedRow() {
    return selectedRow;
  }

  return { setSelectedItem, getSelectedRow };
}
