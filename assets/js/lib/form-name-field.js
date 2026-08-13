import { renderActivityTypeIcon } from '../pages/activites/IconsType.js';
import { renderRestaurantTypeIcon } from '../pages/restaurants/IconsType.js';
import { renderMovieTypeIcon } from '../pages/films/IconsType.js';

const NAME_FIELDS = new Set(['nom']);
const MOVIE_TITLE_FIELDS = new Set(['titre']);

export function isNameField(fieldName) {
  return NAME_FIELDS.has(fieldName);
}

export function isMovieTitleField(fieldName) {
  return MOVIE_TITLE_FIELDS.has(fieldName);
}

export const MOVIE_TITLE_FIELD_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect width="18" height="18" x="3" y="3" rx="2"/>
    <path d="M7 3v18"/>
    <path d="M3 7.5h4"/>
    <path d="M3 12h18"/>
    <path d="M3 16.5h4"/>
    <path d="M17 3v18"/>
    <path d="M17 7.5h4"/>
    <path d="M17 16.5h4"/>
  </svg>
`;

export const NAME_FIELD_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/>
    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>
  </svg>
`;

export function renderPlaceTypeIconHtml(categoryId, typeValue, { width = 18, height = 18 } = {}) {
  if (!typeValue) return '';

  if (categoryId === 'restaurants') {
    return renderRestaurantTypeIcon(typeValue, { width, height });
  }

  if (categoryId === 'activities') {
    return renderActivityTypeIcon(typeValue, { width, height });
  }

  return '';
}

export function updatePlaceNameFieldIcon(form, categoryId, typeValue) {
  const iconHtml = renderPlaceTypeIconHtml(categoryId, typeValue);
  if (!form || !iconHtml) return;

  const wrap = form.querySelector('.place-name-field .address-field-icon, .name-field .address-field-icon');
  const fieldWrap = wrap?.closest('.form-input-wrap');
  if (!wrap) return;

  wrap.innerHTML = iconHtml;
  fieldWrap?.classList.add('is-type-icon');
}

export function resetPlaceNameFieldIcon(form) {
  const wrap = form.querySelector('.place-name-field .address-field-icon, .name-field .address-field-icon');
  const fieldWrap = wrap?.closest('.form-input-wrap');
  if (!wrap) return;

  wrap.innerHTML = NAME_FIELD_ICON;
  fieldWrap?.classList.remove('is-type-icon');
}

export function renderNameFieldInputWrap({ inputHtml, extraWrapClass = '' } = {}) {
  const wrapClass = ['address-field', 'name-field', extraWrapClass].filter(Boolean).join(' ');

  return `
    <div class="form-input-wrap ${wrapClass}">
      <span class="address-field-icon">${NAME_FIELD_ICON}</span>
      ${inputHtml}
    </div>
  `;
}

export function renderMovieTitleFieldInputWrap({ inputHtml } = {}) {
  return `
    <div class="form-input-wrap address-field name-field movie-title-field">
      <span class="address-field-icon">${MOVIE_TITLE_FIELD_ICON}</span>
      ${inputHtml}
    </div>
  `;
}

export function updateMovieTitleFieldIcon(form, typeValue) {
  if (!form || !typeValue) return;

  const iconHtml = renderMovieTypeIcon(typeValue, { width: 18, height: 18 });
  const wrap = form.querySelector('.movie-title-field .address-field-icon');
  const fieldWrap = wrap?.closest('.form-input-wrap');
  if (!wrap || !iconHtml) return;

  wrap.innerHTML = iconHtml;
  fieldWrap?.classList.add('is-type-icon');
}

export function resetMovieTitleFieldIcon(form) {
  const wrap = form.querySelector('.movie-title-field .address-field-icon');
  const fieldWrap = wrap?.closest('.form-input-wrap');
  if (!wrap) return;

  wrap.innerHTML = MOVIE_TITLE_FIELD_ICON;
  fieldWrap?.classList.remove('is-type-icon');
}
