/**
 * Tags partagés activités / restos + badge pin (priorité).
 */
import { Binoculars, Cat, Tag } from '../vendor/lucide.mjs';
import { getFieldOptionLabel } from './custom-types.js';

/** Tags avec icône pin dédiée (ordre = priorité d’affichage). Couleur = thème catégorie. */
export const PIN_TAG_BADGE_DEFS = [
  {
    value: 'vue_panoramique',
    label: 'Vue panoramique',
    Icon: Binoculars,
  },
  {
    value: 'chat',
    label: 'Chat',
    Icon: Cat,
  },
];

export const TAG_BADGE_CATEGORIES = ['activities', 'restaurants'];

export const DEFAULT_ITEM_TAG_OPTIONS = PIN_TAG_BADGE_DEFS.map(({ value, label }) => ({
  value,
  label,
}));

export const GENERIC_TAG_BADGE = {
  value: 'generic',
  Icon: Tag,
};

const PIN_TAG_BY_VALUE = new Map(PIN_TAG_BADGE_DEFS.map((def) => [def.value, def]));

export function normalizeItemTags(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => String(entry || '').trim()).filter(Boolean))];
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return normalizeItemTags(parsed);
    } catch {
      // CSV legacy
    }
    return [...new Set(value.split(',').map((entry) => entry.trim()).filter(Boolean))];
  }
  return [];
}

/** Tag affiché en badge pin (1 max) : priorité définitions connues, sinon premier tag. */
export function getPinTagValue(tags) {
  const list = normalizeItemTags(tags);
  if (!list.length) return '';

  for (const def of PIN_TAG_BADGE_DEFS) {
    if (list.includes(def.value)) return def.value;
  }
  return list[0];
}

export function getPinTagBadgeDef(tagValue) {
  if (!tagValue) return null;
  return PIN_TAG_BY_VALUE.get(tagValue) || null;
}

function getTagBadgeSlug(tagValue) {
  if (!tagValue) return '';
  return PIN_TAG_BY_VALUE.has(tagValue) ? tagValue : 'generic';
}

export function getTagBadgeImageId(tagValue, categoryId) {
  const slug = getTagBadgeSlug(tagValue);
  if (!slug || !categoryId) return '';
  return `map-pin-tag-${categoryId}-${slug}-v2`;
}

export function getAllTagBadgeImageIds() {
  const ids = [];
  for (const categoryId of TAG_BADGE_CATEGORIES) {
    for (const def of PIN_TAG_BADGE_DEFS) {
      ids.push(getTagBadgeImageId(def.value, categoryId));
    }
    ids.push(getTagBadgeImageId('generic', categoryId));
  }
  return ids;
}

export function renderItemTagChipsHtml(categoryId, tags, escapeHtml) {
  return normalizeItemTags(tags).map((value) => (
    `<span class="act-chip act-chip--tag">${escapeHtml(getFieldOptionLabel(categoryId, 'tags', value))}</span>`
  )).join('');
}
