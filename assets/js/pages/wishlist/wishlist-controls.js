import { escapeHtml } from '../../lib/escape-html.js';

function buildOptionsSignature(options) {
  return options.map((opt) => `${opt.value}:${opt.label}:${opt.ariaLabel || ''}`).join('|');
}

export function initWishlistControls({
  signal,
  getSegmentOptions = () => [],
  getFilterState,
  setAuthor,
} = {}) {
  const segmentsEl = document.getElementById('wishlist-status-segments');

  if (!segmentsEl) return { sync: () => {} };

  let renderedSignature = '';

  function renderSegments(options, currentAuthor) {
    segmentsEl.innerHTML = options.map((opt) => `
      <button
        type="button"
        class="act-view-switch-btn${currentAuthor === opt.value ? ' is-active' : ''}"
        role="radio"
        aria-checked="${currentAuthor === opt.value ? 'true' : 'false'}"
        aria-label="${escapeHtml(opt.ariaLabel || opt.label)}"
        title="${escapeHtml(opt.ariaLabel || opt.label)}"
        data-author="${escapeHtml(opt.value)}"
      >
        <span class="wishlist-author-switch-label">${escapeHtml(opt.label)}</span>
      </button>
    `).join('');
    renderedSignature = buildOptionsSignature(options);
  }

  function syncActiveState(currentAuthor) {
    segmentsEl.querySelectorAll('[data-author]').forEach((btn) => {
      const isActive = btn.dataset.author === currentAuthor;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
  }

  function sync() {
    const currentAuthor = getFilterState()?.status || 'mine';
    const options = getSegmentOptions();
    const signature = buildOptionsSignature(options);

    if (signature !== renderedSignature) {
      renderSegments(options, currentAuthor);
      return;
    }

    syncActiveState(currentAuthor);
  }

  segmentsEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-author]');
    if (!btn || btn.classList.contains('is-active')) return;
    setAuthor?.(btn.dataset.author);
  }, { signal });

  sync();

  return { sync };
}
