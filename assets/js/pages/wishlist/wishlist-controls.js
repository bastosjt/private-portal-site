import { escapeHtml } from '../../lib/escape-html.js';

export function initWishlistControls({
  signal,
  getSegmentOptions = () => [],
  getFilterState,
  setAuthor,
} = {}) {
  const segmentsEl = document.getElementById('wishlist-status-segments');

  if (!segmentsEl) return { sync: () => {} };

  function renderSegments() {
    const currentAuthor = getFilterState()?.status || 'mine';
    const options = getSegmentOptions();

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
  }

  function sync() {
    renderSegments();
  }

  segmentsEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-author]');
    if (!btn) return;
    setAuthor?.(btn.dataset.author);
    sync();
  }, { signal });

  sync();

  return { sync };
}
