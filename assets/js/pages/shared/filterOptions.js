import { getFieldOptionLabel, getCategoryFieldOptions } from '../../lib/custom-types.js';
import { sortOptionsByLabel } from '../../lib/options-labels.js';

export function buildFieldFilterOptions({
  items,
  fieldName,
  getFieldLabel,
  categoryId = null,
  fieldOptions = null,
}) {
  const counts = new Map();
  for (const item of items) {
    const value = item[fieldName];
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  const result = [];
  const seen = new Set();
  const options = fieldOptions ?? (categoryId ? getCategoryFieldOptions(categoryId, fieldName) : []);

  for (const opt of options) {
    if ((counts.get(opt.value) || 0) > 0) {
      result.push(opt);
      seen.add(opt.value);
    }
  }

  for (const [value, count] of counts) {
    if (count > 0 && !seen.has(value)) {
      result.push({ value, label: getFieldLabel(fieldName, value) });
    }
  }

  return sortOptionsByLabel(result);
}

export function buildMapFieldFilterOptions(categoryId, fieldName, items) {
  const values = new Map();

  for (const item of items) {
    const value = item[fieldName];
    if (!value) continue;
    if (!values.has(value)) {
      values.set(value, getFieldOptionLabel(categoryId, fieldName, value) || value);
    }
  }

  return [...values.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
    .map(([value, label]) => ({ value, label }));
}
