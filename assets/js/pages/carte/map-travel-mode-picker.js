import { escapeHtml } from '../../lib/escape-html.js';
import { getCategoryStatusLabels } from '../../lib/category-status-labels.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';
import { lockScroll, unlockScroll } from '../../lib/scroll-lock.js';
import { MODAL_DRAG_HANDLE_HTML, wireModalDragClose } from '../../lib/modal-drag-close.js';

const TRAVEL_THEME = 'blue';
const STATUS = getCategoryStatusLabels('travels');

function getTravelTitle(travel) {
  return travel?.destination?.trim() || 'Sans destination';
}

function getTravelMeta(travel) {
  const parts = [
    travel?.pays?.trim(),
    travel?.periode?.trim(),
    travel?.done ? STATUS.done : STATUS.todo,
  ].filter(Boolean);
  return parts.join(' · ');
}

function renderTravelListHtml(travels, selectedId) {
  if (!travels.length) return '';

  return `
    <div class="map-travel-picker-list" role="listbox" aria-label="Voyages">
      ${travels.map((travel) => {
        const selected = travel.id === selectedId;
        const done = Boolean(travel.done);
        return `
          <button
            type="button"
            class="map-travel-picker-item${selected ? ' is-selected' : ''}${done ? ' is-done' : ''}"
            data-theme="${TRAVEL_THEME}"
            data-travel-id="${escapeHtml(travel.id)}"
            role="option"
            aria-selected="${selected ? 'true' : 'false'}"
          >
            <span class="map-travel-picker-item-icon" aria-hidden="true">
              ${renderNavIcon('travel', { strokeWidth: 1.75 })}
            </span>
            <span class="map-travel-picker-item-copy">
              <span class="map-travel-picker-item-title">${escapeHtml(getTravelTitle(travel))}</span>
              <span class="map-travel-picker-item-meta">${escapeHtml(getTravelMeta(travel))}</span>
            </span>
            ${selected ? `<span class="map-travel-picker-item-check" aria-hidden="true">${renderNavIcon('check', { strokeWidth: 2.5, width: 16, height: 16 })}</span>` : ''}
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function renderEmptyStateHtml() {
  return `
    <div class="map-travel-picker-state" data-theme="${TRAVEL_THEME}">
      <p class="add-picker-lead">Aucun voyage pour le moment</p>
      <p class="map-travel-picker-hint">
        Le mode voyage concentre la carte sur une destination - pin, zone et lieux associés.
        Ajoutez un voyage pour commencer.
      </p>
      <button type="button" class="add-form-submit map-travel-picker-cta" data-travel-action="create">
        Nouveau voyage
      </button>
    </div>
  `;
}

function renderDoneBannerHtml(travel) {
  if (!travel?.done) return '';
  return `
    <div class="map-travel-picker-banner" data-theme="${TRAVEL_THEME}">
      <p class="map-travel-picker-banner-title">${escapeHtml(getTravelTitle(travel))} est déjà réalisé</p>
      <p class="map-travel-picker-banner-text">
        Choisissez un prochain voyage à vivre, ou créez-en un nouveau pour le mode voyage.
      </p>
    </div>
  `;
}

function renderPickerBodyHtml({ travels, selectedId, highlightDoneTravel }) {
  if (!travels.length) {
    return `<div class="add-modal-content">${renderEmptyStateHtml()}</div>`;
  }

  const sorted = [...travels].sort((a, b) => {
    const aDone = Boolean(a.done);
    const bDone = Boolean(b.done);
    if (aDone !== bDone) return aDone ? 1 : -1;
    return getTravelTitle(a).localeCompare(getTravelTitle(b), 'fr');
  });

  return `
    <div class="add-modal-content">
      <div class="add-form-scroll map-travel-picker-scroll">
        ${renderDoneBannerHtml(highlightDoneTravel)}
        <p class="add-picker-lead">Quel voyage explorer&nbsp;?</p>
        <p class="map-travel-picker-hint">
          Un seul voyage à la fois - pin, zone bleue et lieux liés.
        </p>
        ${renderTravelListHtml(sorted, selectedId)}
      </div>
      <div class="add-form-footer map-travel-picker-footer" data-theme="${TRAVEL_THEME}">
        <button type="button" class="add-form-submit map-travel-picker-cta" data-travel-action="create">
          Nouveau voyage
        </button>
      </div>
    </div>
  `;
}

export function initMapTravelModePicker({ signal } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'add-modal-overlay hidden';
  overlay.id = 'map-travel-mode-overlay';
  overlay.innerHTML = `
    <div class="add-modal" role="dialog" aria-modal="true" aria-labelledby="map-travel-mode-title">
      ${MODAL_DRAG_HANDLE_HTML}
      <div class="add-modal-head">
        <button type="button" class="add-modal-back hidden" tabindex="-1" aria-hidden="true"></button>
        <h2 class="add-modal-title" id="map-travel-mode-title">Mode voyage</h2>
        <button type="button" class="add-modal-close" id="map-travel-mode-close" aria-label="Fermer">
          ${renderNavIcon('close', { strokeWidth: 2 })}
        </button>
      </div>
      <div class="add-modal-body" id="map-travel-mode-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const bodyEl = overlay.querySelector('#map-travel-mode-body');
  const closeBtn = overlay.querySelector('#map-travel-mode-close');
  let isOpen = false;
  let resolveOpen = null;

  const finish = (result) => {
    resolveOpen?.(result);
    resolveOpen = null;
    close();
  };

  const close = () => {
    if (!isOpen) return;
    dragClose.reset();
    overlay.classList.remove('is-active');
    isOpen = false;
    window.setTimeout(() => {
      if (!isOpen) {
        overlay.classList.add('hidden');
        bodyEl.innerHTML = '';
        unlockScroll();
      }
    }, 360);
    if (resolveOpen) {
      resolveOpen({ action: 'dismiss' });
      resolveOpen = null;
    }
  };

  const mount = ({
    travels = [],
    selectedId = '',
    highlightDoneTravel = null,
  } = {}) => {
    bodyEl.innerHTML = renderPickerBodyHtml({
      travels,
      selectedId,
      highlightDoneTravel,
    });
  };

  const open = (options = {}) => {
    if (isOpen) close();
    mount(options);
    overlay.classList.remove('hidden');
    lockScroll();
    requestAnimationFrame(() => {
      overlay.classList.add('is-active');
      isOpen = true;
    });

    return new Promise((resolve) => {
      resolveOpen = resolve;
    });
  };

  const onOverlayClick = (event) => {
    if (event.target === overlay) finish({ action: 'dismiss' });
  };

  const onBodyClick = async (event) => {
    const createBtn = event.target.closest('[data-travel-action="create"]');
    if (createBtn) {
      finish({ action: 'create' });
      return;
    }

    const itemBtn = event.target.closest('[data-travel-id]');
    if (!itemBtn) return;

    const travelId = itemBtn.dataset.travelId;
    if (!travelId) return;

    finish({ action: 'select', travelId });
  };

  closeBtn?.addEventListener('click', () => finish({ action: 'dismiss' }), { signal });
  overlay.addEventListener('click', onOverlayClick, { signal });
  bodyEl.addEventListener('click', onBodyClick, { signal });

  const dragClose = wireModalDragClose(overlay, {
    onClose: () => finish({ action: 'dismiss' }),
    signal,
  });

  signal?.addEventListener('abort', () => {
    if (isOpen) {
      overlay.classList.remove('is-active');
      overlay.classList.add('hidden');
      bodyEl.innerHTML = '';
      unlockScroll();
      isOpen = false;
    }
    overlay.remove();
  }, { once: true });

  return { open, close };
}
