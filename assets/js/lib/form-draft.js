const STORAGE_PREFIX = 'portal-form-draft';

function getStorageKey(categoryId, itemId = null) {
  return `${STORAGE_PREFIX}:${categoryId}:${itemId || 'new'}`;
}

export function snapshotFormFields(form, category) {
  if (!form || !category) return null;

  const fields = {};
  const meta = {};

  for (const field of category.fields) {
    if (field.type === 'priceRange') {
      fields.prixMin = form.elements.prixMin?.value ?? '';
      fields.prixMax = form.elements.prixMax?.value ?? '';
      continue;
    }

    const el = form.elements[field.name];
    if (!el) continue;

    fields[field.name] = el.value ?? '';

    if (field.type === 'address') {
      if (el.dataset.lat) meta[`${field.name}Lat`] = el.dataset.lat;
      if (el.dataset.lng) meta[`${field.name}Lng`] = el.dataset.lng;
    }
  }

  const hasContent = Object.values(fields).some((value) => String(value).trim());
  if (!hasContent) return null;

  return {
    fields,
    meta,
    savedAt: Date.now(),
  };
}

export function saveFormDraft(categoryId, itemId, form, category) {
  const snapshot = snapshotFormFields(form, category);
  const key = getStorageKey(categoryId, itemId);

  if (!snapshot) {
    localStorage.removeItem(key);
    return false;
  }

  localStorage.setItem(key, JSON.stringify(snapshot));
  return true;
}

export function loadFormDraft(categoryId, itemId) {
  try {
    const raw = localStorage.getItem(getStorageKey(categoryId, itemId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearFormDraft(categoryId, itemId) {
  localStorage.removeItem(getStorageKey(categoryId, itemId));
}

export function applyFormDraft(form, category, draft) {
  if (!form || !category || !draft?.fields) return false;

  for (const field of category.fields) {
    if (field.type === 'priceRange') {
      if (form.elements.prixMin && draft.fields.prixMin != null) {
        form.elements.prixMin.value = draft.fields.prixMin;
      }
      if (form.elements.prixMax && draft.fields.prixMax != null) {
        form.elements.prixMax.value = draft.fields.prixMax;
      }
      continue;
    }

    const value = draft.fields[field.name];
    if (value == null || value === '') continue;

    const el = form.elements[field.name];
    if (!el) continue;

    el.value = value;

    if (field.type === 'address') {
      const lat = draft.meta?.[`${field.name}Lat`];
      const lng = draft.meta?.[`${field.name}Lng`];
      if (lat && lng) {
        el.dataset.lat = lat;
        el.dataset.lng = lng;
      } else {
        delete el.dataset.lat;
        delete el.dataset.lng;
      }
    }
  }

  return true;
}
