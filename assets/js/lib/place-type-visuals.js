import { renderPlaceTypeIconHtml, updatePlaceNameFieldIcon } from './form-name-field.js';

function updateMapsImportPreviewTypeIcon(form, category, typeValue) {
  const hasMapsImport = category?.fields?.some((field) => field.urlImport?.provider === 'googleMaps');
  if (!hasMapsImport || !form || !typeValue) return;

  const feedbackEl = form.querySelector('[data-url-import-preview].is-visible[data-state="success"]');
  const imageEl = feedbackEl?.querySelector('.url-import-preview__image');
  if (!imageEl) return;

  const iconHtml = renderPlaceTypeIconHtml(category.id, typeValue, { width: 22, height: 22 });
  if (!iconHtml) return;

  imageEl.innerHTML = iconHtml;
  imageEl.classList.add('url-import-preview__image--placeholder', 'url-import-preview__image--type-icon');
}

export function applyPlaceTypeVisuals(form, category, typeValue) {
  if (!form || !category || !typeValue) return;

  updatePlaceNameFieldIcon(form, category.id, typeValue);
  updateMapsImportPreviewTypeIcon(form, category, typeValue);
}
