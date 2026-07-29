import { escapeHtml } from '../lib/escape-html.js';
import { devError } from '../lib/dev-log.js';
import {
  ADD_OPTION_VALUE,
  addCustomOption,
  getCategoryFieldOptions,
  getFieldOptionLabel,
  getStorageKey,
  makeUniqueValue,
  slugifyLabel,
} from '../lib/custom-types.js';
import { formatOptionLabel, sortOptionsByLabel } from '../lib/options-labels.js';
import { PLACEHOLDER_OPTION_VALUE } from './select-custom.js';

function getMergedOptions(categoryId, field, extra = []) {
  const options = getCategoryFieldOptions(categoryId, field.name);
  const seen = new Set();
  return sortOptionsByLabel([...options, ...extra].filter((opt) => {
    if (!opt?.value || seen.has(opt.value)) return false;
    seen.add(opt.value);
    return true;
  }));
}

function getFieldIds(field) {
  const base = `add-field-${field.name}`;
  return {
    picker: `${base}-picker`,
    addPanel: `${base}-add`,
    addInput: `${base}-add-input`,
  };
}

function renderPickerOptions(field, categoryId, selectedValue, extra = []) {
  const options = getMergedOptions(categoryId, field, extra);

  const html = [
    `<option value="${PLACEHOLDER_OPTION_VALUE}"${selectedValue ? '' : ' selected'}>-</option>`,
    ...options.map((opt) => (
      `<option value="${escapeHtml(opt.value)}"${opt.value === selectedValue ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`
    )),
  ];

  if (field.allowCustom) {
    html.push(`<option value="${ADD_OPTION_VALUE}">➕ Ajouter…</option>`);
  }

  return html.join('');
}

export function renderMultiSelectField(field, categoryId) {
  const ids = getFieldIds(field);
  const storageKey = getStorageKey(categoryId, field.name);

  const addBlock = field.allowCustom ? `
    <div class="form-select-add" id="${ids.addPanel}" aria-hidden="true">
      <div class="form-select-add-inner">
        <div class="form-input-wrap">
          <input
            type="text"
            id="${ids.addInput}"
            class="form-input form-select-add-input"
            placeholder="Nouveau tag…"
            maxlength="40"
            autocomplete="off"
          >
        </div>
        <button type="button" class="form-select-add-btn" data-tag-add-btn="${ids.picker}">
          Ajouter à la liste
        </button>
      </div>
    </div>
  ` : '';

  return `
    <div class="form-field form-field--select form-field--tags" data-tags-field="${field.name}">
      <label for="${ids.picker}">
        <span class="form-field-label">${escapeHtml(field.label)}</span>
        <div class="form-select-wrap">
          <select
            id="${ids.picker}"
            class="form-select form-tags-picker"
            data-storage-key="${storageKey}"
            data-tags-name="${field.name}"
          >${renderPickerOptions(field, categoryId, '')}</select>
        </div>
      </label>
      ${addBlock}
    </div>
  `;
}

function rebuildTagField(form, field, categoryId, selectedValue) {
  const ids = getFieldIds(field);
  const picker = form.querySelector(`#${ids.picker}`);
  if (!picker) return;

  const extra = selectedValue ? [{
    value: selectedValue,
    label: getFieldOptionLabel(categoryId, field.name, selectedValue),
  }] : [];
  picker.innerHTML = renderPickerOptions(field, categoryId, selectedValue || '', extra);
}

function toggleAddPanel(form, field, show) {
  const ids = getFieldIds(field);
  const panel = form.querySelector(`#${ids.addPanel}`);
  const input = form.querySelector(`#${ids.addInput}`);
  if (!panel) return;

  panel.classList.toggle('is-open', show);
  panel.setAttribute('aria-hidden', show ? 'false' : 'true');
  if (show) {
    if (input) input.value = '';
    requestAnimationFrame(() => input?.focus());
  }
}

export function setMultiSelectFieldValues(form, field, categoryId, values = []) {
  const unique = [...new Set(values)].filter(Boolean);
  rebuildTagField(form, field, categoryId, unique[0] || '');
}

export function getMultiSelectFieldValues(form, field) {
  const ids = getFieldIds(field);
  const picker = form.querySelector(`#${ids.picker}`);
  if (!picker || !picker.value || picker.value === PLACEHOLDER_OPTION_VALUE) return [];
  return [picker.value];
}

export async function initMultiSelectField(form, field, categoryId) {
  if (!form || !field) return () => {};

  const ids = getFieldIds(field);
  const picker = form.querySelector(`#${ids.picker}`);
  const addBtn = form.querySelector(`[data-tag-add-btn="${ids.picker}"]`);
  const addInput = form.querySelector(`#${ids.addInput}`);
  const storageKey = picker?.dataset.storageKey;

  if (!picker) return () => {};

  const onPickerChange = () => {
    if (picker.value === ADD_OPTION_VALUE) {
      toggleAddPanel(form, field, true);
      const current = getMultiSelectFieldValues(form, field);
      picker.value = current[0] || PLACEHOLDER_OPTION_VALUE;
      return;
    }

    toggleAddPanel(form, field, false);
  };

  const commitCustomTag = () => {
    if (!field.allowCustom || !addInput || !storageKey) return;

    const label = formatOptionLabel(addInput.value.trim());
    if (!label) {
      addInput.focus();
      return;
    }

    if (addBtn) addBtn.disabled = true;

    const used = new Set(getMultiSelectFieldValues(form, field));
    const value = makeUniqueValue(slugifyLabel(label), used);

    addCustomOption(storageKey, { value, label })
      .then(() => {
        rebuildTagField(form, field, categoryId, value);
        toggleAddPanel(form, field, false);
      })
      .catch((err) => {
        devError('addCustomOption tag:', err);
      })
      .finally(() => {
        if (addBtn) addBtn.disabled = false;
      });
  };

  picker.addEventListener('change', onPickerChange);
  addBtn?.addEventListener('click', commitCustomTag);
  addInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitCustomTag();
    }
  });

  return () => {
    picker.removeEventListener('change', onPickerChange);
  };
}

export async function initFormMultiSelectFields(form, category) {
  const cleanups = [];
  for (const field of category.fields) {
    if (field.type !== 'multiSelect') continue;
    cleanups.push(await initMultiSelectField(form, field, category.id));
  }
  return () => cleanups.forEach((fn) => fn());
}
