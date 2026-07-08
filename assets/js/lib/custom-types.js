import { formatOptionLabel } from './options-labels.js';
import { DEFAULT_FIELD_OPTIONS } from './field-options-defaults.js';
import { HOME_CATEGORIES } from '../config.js';
import { fetchAllCustomOptions, persistCustomOptions } from '../firebase/firestore.js';

/** Ancienne clé localStorage — migrée vers Firestore au premier chargement. */
const LEGACY_STORAGE_KEY = 'portal-custom-options';

/** Catégories dont les types proviennent exclusivement de Firestore. */
export const FIRESTORE_OPTION_CATEGORIES = ['activities', 'restaurants', 'travels', 'movies'];

let cache = {};
let initPromise = null;

export function getStorageKey(categoryId, fieldName) {
  return `${categoryId}.${fieldName}`;
}

function readLegacyLocalStorage() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function normalizeOptions(options) {
  return options.map((opt) => ({
    ...opt,
    label: formatOptionLabel(opt.label),
  }));
}

async function seedMissingDefaultOptions(initializedKeys) {
  const updates = [];

  for (const [storageKey, defaults] of Object.entries(DEFAULT_FIELD_OPTIONS)) {
    const categoryId = storageKey.split('.')[0];
    if (!FIRESTORE_OPTION_CATEGORIES.includes(categoryId)) continue;
    if (initializedKeys.has(storageKey)) continue;

    cache[storageKey] = normalizeOptions(defaults.filter((opt) => opt?.value));
    initializedKeys.add(storageKey);
    updates.push(persistCustomOptions(storageKey, cache[storageKey]));
  }

  await Promise.all(updates);
}

async function migrateStorageKeyAliases() {
  const aliases = [
    ['voyages.type', 'travels.type'],
  ];

  for (const [legacyKey, targetKey] of aliases) {
    if (cache[targetKey]?.length) continue;
    if (!cache[legacyKey]?.length) continue;

    cache[targetKey] = cache[legacyKey];
    await persistCustomOptions(targetKey, cache[targetKey]);
  }
}

async function migrateLegacyLocalStorage() {
  const legacy = readLegacyLocalStorage();
  if (!Object.keys(legacy).length) return;

  const migrations = [];

  for (const [storageKey, options] of Object.entries(legacy)) {
    if (!Array.isArray(options)) continue;

    const existing = cache[storageKey] || [];
    const seen = new Set(existing.map((opt) => opt.value));
    const toAdd = options.filter((opt) => opt?.value && !seen.has(opt.value));

    if (!toAdd.length) continue;

    cache[storageKey] = [...existing, ...normalizeOptions(toAdd)];
    migrations.push(persistCustomOptions(storageKey, cache[storageKey]));
  }

  await Promise.all(migrations);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export async function reloadCustomOptions() {
  cache = await fetchAllCustomOptions();
  await migrateStorageKeyAliases();
}

export async function initCustomOptions() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await reloadCustomOptions();
    await migrateStorageKeyAliases();

    const initializedKeys = new Set(Object.keys(cache));
    await migrateLegacyLocalStorage();

    for (const storageKey of Object.keys(cache)) {
      initializedKeys.add(storageKey);
    }

    await seedMissingDefaultOptions(initializedKeys);
  })();

  return initPromise;
}

export function getCustomOptions(storageKey) {
  return normalizeOptions(cache[storageKey] || []);
}

export function getCategoryFieldOptions(categoryId, fieldName) {
  return getCustomOptions(getStorageKey(categoryId, fieldName));
}

export function getFieldOptionLabel(categoryId, fieldName, value) {
  if (!value) return '';

  const category = HOME_CATEGORIES.find((cat) => cat.id === categoryId);
  const field = category?.fields.find((f) => f.name === fieldName);

  if (field && !field.allowCustom) {
    const base = field.options?.find((opt) => opt.value === value);
    if (base) return base.label;
  }

  const option = getCustomOptions(getStorageKey(categoryId, fieldName))
    .find((opt) => opt.value === value);
  return option?.label || formatOptionLabel(value.replace(/_/g, ' '));
}

export async function addCustomOption(storageKey, option) {
  await initCustomOptions();

  const normalized = {
    ...option,
    label: formatOptionLabel(option.label),
  };
  const existing = cache[storageKey] || [];

  if (existing.some((item) => item.value === normalized.value)) {
    return normalized;
  }

  cache[storageKey] = [...existing, normalized];
  await persistCustomOptions(storageKey, cache[storageKey]);
  return normalized;
}

export async function removeCustomOption(storageKey, value) {
  await initCustomOptions();

  const existing = cache[storageKey] || [];
  const next = existing.filter((item) => item.value !== value);

  if (next.length === existing.length) return false;

  cache[storageKey] = next;
  await persistCustomOptions(storageKey, next);
  return true;
}

export function slugifyLabel(label) {
  const base = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return base || 'personnalise';
}

export function makeUniqueValue(base, usedValues) {
  let value = base;
  let index = 2;
  while (usedValues.has(value)) {
    value = `${base}_${index}`;
    index += 1;
  }
  return value;
}

export const ADD_OPTION_VALUE = '__add__';
