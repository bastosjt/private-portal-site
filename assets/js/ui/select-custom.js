import { escapeHtml } from '../lib/escape-html.js';
import { devWarn, devError } from '../lib/dev-log.js';
import {
  ADD_OPTION_VALUE,
  addCustomOption,
  getCategoryFieldOptions,
  getStorageKey,
  initCustomOptions,
  makeUniqueValue,
  slugifyLabel,
} from '../lib/custom-types.js';
import { formatOptionLabel, sortOptionsByLabel } from '../lib/options-labels.js';
import { ensureItems, getCachedItems } from '../data/appDataCache.js';

export const PLACEHOLDER_OPTION_VALUE = '';

function getTravelSelectOptions() {
  const travels = getCachedItems('travels') ?? [];
  return sortOptionsByLabel(travels.map((travel) => ({
    value: travel.id,
    label: travel.destination || 'Sans titre',
  })));
}

function getDynamicFieldOptions(field) {
  if (field.optionsFrom === 'travels') return getTravelSelectOptions();
  return [];
}

function renderTravelSelectOptions(options, selectedValue) {
  const html = [`<option value="${PLACEHOLDER_OPTION_VALUE}"${!selectedValue ? ' selected' : ''}>-</option>`];

  for (const opt of options) {
    const selected = opt.value === selectedValue ? ' selected' : '';
    html.push(`<option value="${escapeHtml(opt.value)}"${selected}>${escapeHtml(opt.label)}</option>`);
  }

  return html.join('');
}

function rebuildTravelSelect(select, field, selectedValue, extra = []) {
  const options = sortOptionsByLabel([...getDynamicFieldOptions(field), ...extra].filter((opt, index, list) => {
    return opt?.value && list.findIndex((entry) => entry.value === opt.value) === index;
  }));
  const resolved = selectedValue && options.some((opt) => opt.value === selectedValue)
    ? selectedValue
    : PLACEHOLDER_OPTION_VALUE;
  select.innerHTML = renderTravelSelectOptions(options, resolved);
  select.value = resolved;
  return resolved;
}

function getMergedFieldOptions(field, categoryId, extra = []) {
  const options = field.allowCustom
    ? getCategoryFieldOptions(categoryId, field.name)
    : (field.options || []);

  const seen = new Set();

  return sortOptionsByLabel([...options, ...extra].filter((opt) => {
    if (!opt?.value || seen.has(opt.value)) return false;
    seen.add(opt.value);
    return true;
  }));
}

function renderSelectOptions(field, options, selectedValue) {
  const html = [];

  if (field.allowCustom) {
    const placeholderSelected = !selectedValue ? ' selected' : '';
    html.push(`<option value="${PLACEHOLDER_OPTION_VALUE}"${placeholderSelected}>-</option>`);
  }

  for (const opt of options) {
    const selected = opt.value === selectedValue ? ' selected' : '';
    html.push(`<option value="${escapeHtml(opt.value)}"${selected}>${escapeHtml(opt.label)}</option>`);
  }

  if (field.allowCustom) {
    html.push(`<option value="${ADD_OPTION_VALUE}">➕ Ajouter…</option>`);
  }

  return html.join('');
}

function rebuildSelect(select, field, categoryId, selectedValue, extra = []) {
  const options = getMergedFieldOptions(field, categoryId, extra);
  const resolved = selectedValue && options.some((opt) => opt.value === selectedValue)
    ? selectedValue
    : PLACEHOLDER_OPTION_VALUE;
  select.innerHTML = renderSelectOptions(field, options, resolved);
  select.value = resolved;
  return resolved;
}

function buildOptionsHtml(field, categoryId) {
  if (field.optionsFrom === 'travels') {
    return renderTravelSelectOptions(getDynamicFieldOptions(field), PLACEHOLDER_OPTION_VALUE);
  }

  if (field.allowCustom) {
    const options = getMergedFieldOptions(field, categoryId);
    return renderSelectOptions(field, options, PLACEHOLDER_OPTION_VALUE);
  }

  return (field.options || []).map((opt) => {
    const selected = opt.value === field.default ? ' selected' : '';
    return `<option value="${escapeHtml(opt.value)}"${selected}>${escapeHtml(opt.label)}</option>`;
  }).join('');
}

export function renderSelectField(field, categoryId) {
  const id = `add-field-${field.name}`;
  const required = field.required ? ' required' : '';
  const storageKey = getStorageKey(categoryId, field.name);

  const addBlock = field.allowCustom ? `
    <div class="form-select-add" id="${id}-add">
      <div class="form-select-add-inner">
        <div class="form-input-wrap">
          <input
            type="text"
            id="${id}-add-input"
            class="form-input form-select-add-input"
            placeholder="Nouveau type…"
            maxlength="40"
            autocomplete="off"
          >
        </div>
        <button type="button" class="form-select-add-btn" data-select-add="${id}">
          Ajouter à la liste
        </button>
      </div>
    </div>
  ` : '';

  return `
    <div class="form-field form-field--select" data-select-field="${field.name}">
      <label for="${id}">
        <span class="form-field-label">${escapeHtml(field.label)}</span>
        <div class="form-select-wrap">
          <select
            id="${id}"
            name="${field.name}"
            class="form-select"
            data-storage-key="${storageKey}"
            ${field.allowCustom ? 'data-allow-custom="true"' : ''}${required}
          >${buildOptionsHtml(field, categoryId)}</select>
        </div>
      </label>
      ${addBlock}
    </div>
  `;
}

function getUsedValues(select) {
  return new Set(Array.from(select.options).map((opt) => opt.value));
}

function initCustomSelect(select, field, categoryId) {
  const storageKey = select.dataset.storageKey;
  const addPanel = document.getElementById(`${select.id}-add`);
  const addInput = document.getElementById(`${select.id}-add-input`);
  const addBtn = document.querySelector(`[data-select-add="${select.id}"]`);

  if (!storageKey || !addPanel || !addInput || !addBtn) return () => {};

  function toggleAddPanel(show) {
    addPanel.classList.toggle('is-open', show);
    addPanel.setAttribute('aria-hidden', show ? 'false' : 'true');
    if (show) {
      addInput.value = '';
      requestAnimationFrame(() => addInput.focus());
    }
  }

  function onSelectChange() {
    toggleAddPanel(select.value === ADD_OPTION_VALUE);
  }

  function commitCustomOption() {
    const label = addInput.value.trim();
    if (!label) {
      addInput.focus();
      return;
    }

    addBtn.disabled = true;

    const used = getUsedValues(select);
    const value = makeUniqueValue(slugifyLabel(label), used);

    addCustomOption(storageKey, { value, label })
      .then((option) => {
        rebuildSelect(select, field, categoryId, option.value);
        toggleAddPanel(false);
      })
      .catch((err) => {
        devError('addCustomOption:', err);
      })
      .finally(() => {
        addBtn.disabled = false;
      });
  }

  select.addEventListener('change', onSelectChange);
  addBtn.addEventListener('click', commitCustomOption);
  addInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitCustomOption();
    }
  });

  return () => {
    select.removeEventListener('change', onSelectChange);
  };
}

export async function initFormSelectFields(form, category) {
  await initCustomOptions();

  const cleanups = [];

  for (const field of category.fields) {
    if (field.type !== 'select') continue;

    const select = form.elements[field.name];
    if (!select) continue;

    if (field.optionsFrom === 'travels') {
      await ensureItems('travels');
      rebuildTravelSelect(select, field, select.value || PLACEHOLDER_OPTION_VALUE);
      continue;
    }

    if (!field.allowCustom) continue;

    rebuildSelect(select, field, category.id, select.value || PLACEHOLDER_OPTION_VALUE);
    cleanups.push(initCustomSelect(select, field, category.id));
  }

  return () => cleanups.forEach((fn) => fn());
}

function ensureSelectOption(select, value, label) {
  if (!select || !value) return;
  if (select.querySelector(`option[value="${CSS.escape(value)}"]`)) return;

  const addOption = select.querySelector(`option[value="${ADD_OPTION_VALUE}"]`);
  const el = document.createElement('option');
  el.value = value;
  el.textContent = label ? formatOptionLabel(label) : formatOptionLabel(value.replace(/_/g, ' '));

  if (addOption) {
    select.insertBefore(el, addOption);
  } else {
    select.appendChild(el);
  }
}

export function setSelectFieldValue(form, field, value, label, categoryId) {
  const select = form.elements[field.name];
  if (!select) return;

  if (field.optionsFrom === 'travels') {
    const extra = value
      ? [{ value, label: label || formatOptionLabel(value.replace(/_/g, ' ')) }]
      : [];
    rebuildTravelSelect(select, field, value || PLACEHOLDER_OPTION_VALUE, extra);
    return;
  }

  if (!value) return;

  if (field.allowCustom && categoryId) {
    const extra = [{ value, label: label || formatOptionLabel(value.replace(/_/g, ' ')) }];
    rebuildSelect(select, field, categoryId, value, extra);
    return;
  }

  ensureSelectOption(select, value, label);
  select.value = value;
}

export async function getSelectFieldValue(form, field, categoryId) {
  const select = form.elements[field.name];
  if (!select) return '';

  if (field.allowCustom && select.value === ADD_OPTION_VALUE) {
    const addInput = document.getElementById(`${select.id}-add-input`);
    const customLabel = addInput?.value.trim();
    if (customLabel) {
      const storageKey = select.dataset.storageKey;
      const used = getUsedValues(select);
      const value = makeUniqueValue(slugifyLabel(customLabel), used);
      await addCustomOption(storageKey, { value, label: customLabel });
      rebuildSelect(select, field, categoryId, value);
      return value;
    }
    return ADD_OPTION_VALUE;
  }

  return select.value.trim();
}

export { ADD_OPTION_VALUE };
