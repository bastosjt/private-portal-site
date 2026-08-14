import { escapeHtml } from '../lib/escape-html.js';

/**
 * Bloc vide unifié : icône + titre + description + CTA optionnel.
 */
export function renderEmptyStateHtml({
  iconHtml = '',
  title = '',
  description = '',
  ctaHtml = '',
  extraClass = '',
} = {}) {
  const rootClass = ['empty-state', extraClass].filter(Boolean).join(' ');

  return `
    <div class="${rootClass}">
      ${iconHtml ? `<span class="empty-state-icon" aria-hidden="true">${iconHtml}</span>` : ''}
      ${title ? `<p class="empty-state-title">${escapeHtml(title)}</p>` : ''}
      ${description ? `<p class="empty-state-text">${escapeHtml(description)}</p>` : ''}
      ${ctaHtml}
    </div>
  `;
}

export function renderEmptyStateCta(label, attrs = '') {
  return `<button type="button" class="empty-state-cta cat-empty-cta" ${attrs}>${escapeHtml(label)}</button>`;
}
