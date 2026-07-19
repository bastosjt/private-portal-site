const SEARCH_DEBOUNCE_MS = 150;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function syncClearButton(input, clearBtn) {
  if (!clearBtn) return;
  clearBtn.classList.toggle('hidden', !input.value.trim());
}

export function initWishlistControls({
  signal,
  getSegmentOptions = () => [],
  getFilterState,
  setAuthor,
  setSearchQuery,
  getSearchQuery,
  removePriority,
  getPriorityOptions,
} = {}) {
  const segmentsEl = document.getElementById('wishlist-status-segments');
  const searchInput = document.getElementById('wishlist-search-input');
  const clearBtn = document.getElementById('wishlist-search-clear');
  const activeFiltersEl = document.getElementById('wishlist-active-filters');

  if (!segmentsEl || !searchInput) return { sync: () => {} };

  let debounceTimer = null;

  function renderSegments() {
    const currentAuthor = getFilterState()?.status || 'all';
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

  function renderActiveFilters() {
    if (!activeFiltersEl) return;

    const priorities = getFilterState()?.priorite || [];
    const options = getPriorityOptions?.() || [];
    const chips = priorities.map((value) => {
      const label = options.find((opt) => opt.value === value)?.label || value;
      return `
        <button
          type="button"
          class="wishlist-filter-chip"
          data-priority="${escapeHtml(value)}"
          aria-label="Retirer le filtre ${escapeHtml(label)}"
        >
          <span>${escapeHtml(label)}</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      `;
    });

    activeFiltersEl.innerHTML = chips.join('');
    activeFiltersEl.classList.toggle('hidden', chips.length === 0);
  }

  function sync() {
    renderSegments();
    renderActiveFilters();

    const query = getSearchQuery?.() || '';
    if (searchInput.value !== query) searchInput.value = query;
    syncClearButton(searchInput, clearBtn);
  }

  segmentsEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-author]');
    if (!btn) return;
    setAuthor?.(btn.dataset.author);
    sync();
  }, { signal });

  searchInput.addEventListener('input', () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      syncClearButton(searchInput, clearBtn);
      setSearchQuery?.(searchInput.value.trim());
    }, SEARCH_DEBOUNCE_MS);
  }, { signal });

  clearBtn?.addEventListener('click', () => {
    searchInput.value = '';
    syncClearButton(searchInput, clearBtn);
    setSearchQuery?.('');
    searchInput.focus();
  }, { signal });

  activeFiltersEl?.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-priority]');
    if (!chip) return;
    removePriority?.(chip.dataset.priority);
    sync();
  }, { signal });

  signal?.addEventListener('abort', () => {
    window.clearTimeout(debounceTimer);
  }, { once: true });

  sync();

  return { sync };
}
