import { deleteField } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import {
  formatMoneyAmount,
  normalizeItemPrice,
  parseMoneyInput,
} from './format.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderPriceRangeField(field) {
  const id = `add-field-${field.name}`;
  const minPh = field.placeholderMin ? ` placeholder="${escapeHtml(field.placeholderMin)}"` : '';
  const maxPh = field.placeholderMax ? ` placeholder="${escapeHtml(field.placeholderMax)}"` : '';

  return `
    <div class="form-field form-field--price-range">
      <span class="form-field-label" id="${id}-label">${escapeHtml(field.label)}</span>
      <div class="form-price-range" role="group" aria-labelledby="${id}-label">
        <div class="form-input-wrap">
          <input
            type="text"
            id="${id}-min"
            name="prixMin"
            class="form-input"
            inputmode="decimal"
            autocomplete="off"
            aria-label="Prix minimum"${minPh}
          >
        </div>
        <span class="form-price-range-sep" aria-hidden="true">–</span>
        <div class="form-input-wrap">
          <input
            type="text"
            id="${id}-max"
            name="prixMax"
            class="form-input"
            inputmode="decimal"
            autocomplete="off"
            aria-label="Prix maximum (optionnel)"${maxPh}
          >
        </div>
      </div>
      <span class="form-field-hint">Max optionnel pour une fourchette</span>
    </div>
  `;
}

export function populatePriceRangeFields(form, item) {
  const { prixMin, prixMax } = normalizeItemPrice(item);
  const minEl = form.elements.prixMin;
  const maxEl = form.elements.prixMax;

  if (minEl) minEl.value = prixMin != null ? formatMoneyAmount(prixMin) : '';
  if (maxEl) maxEl.value = prixMax != null ? formatMoneyAmount(prixMax) : '';
}

export function validatePriceRangeFields(form) {
  const prixMin = parseMoneyInput(form.elements.prixMin?.value);
  const prixMax = parseMoneyInput(form.elements.prixMax?.value);

  if (prixMax != null && prixMin == null) {
    return 'Indiquez un prix minimum si vous renseignez un maximum.';
  }

  if (prixMin != null && prixMax != null && prixMin > prixMax) {
    return 'Le prix minimum doit être inférieur ou égal au maximum.';
  }

  return null;
}

export function collectPriceRangeData(form, { isEdit = false } = {}) {
  let prixMin = parseMoneyInput(form.elements.prixMin?.value);
  let prixMax = parseMoneyInput(form.elements.prixMax?.value);

  if (prixMin == null && prixMax == null) {
    if (!isEdit) return {};
    return {
      prixMin: deleteField(),
      prixMax: deleteField(),
      prix: deleteField(),
    };
  }

  if (prixMax != null && prixMax === prixMin) {
    prixMax = null;
  }

  const data = {
    prix: deleteField(),
    prixMin,
    prixMax: prixMax != null ? prixMax : deleteField(),
  };

  return data;
}
