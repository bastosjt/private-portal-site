import { getPlaceAddressFieldName, getPlaceNameField, getPlaceSearchField } from './place-form-fields.js';
import { buildGoogleMapsUrl, buildPlaceIdMapsUrl } from './google-maps-url.js';
import { populatePriceRangeFields } from './form-price-field.js';
import { updatePlaceNameFieldIcon } from './form-name-field.js';
import { getFieldOptionLabel } from './custom-types.js';
import {
  getPlaceSuggestionFieldNames,
  resolvePlaceGoogleFieldSuggestions,
  supportsPlaceFieldSuggestions,
} from './place-google-type-mapping.js';
import {
  clearPlaceFieldSuggestions,
  showPlaceFieldSuggestions,
} from '../ui/place-field-suggestions.js';
import { setSelectFieldValue } from '../ui/select-custom.js';

function shouldWriteField(el, onlyEmptyFields) {
  if (!el) return false;
  return !onlyEmptyFields || !el.value?.trim();
}

function getPrimaryTypeIconValue(categoryId, suggestions) {
  if (categoryId === 'restaurants') return suggestions.type || null;
  if (categoryId === 'activities') return suggestions.categorie || null;
  return null;
}

function autoApplyPlaceFieldSuggestions(form, category, googlePlace, { onlyEmptyFields = false } = {}) {
  const suggestions = resolvePlaceGoogleFieldSuggestions(googlePlace, category.id);
  let appliedTypeValue = null;

  for (const fieldName of getPlaceSuggestionFieldNames(category.id)) {
    const value = suggestions[fieldName];
    if (!value) continue;

    const field = category.fields.find((item) => item.name === fieldName);
    if (!field) continue;

    const target = form.elements[fieldName];
    if (onlyEmptyFields && target?.value?.trim()) continue;

    const label = getFieldOptionLabel(category.id, fieldName, value);
    setSelectFieldValue(form, field, value, label, category.id);

    if (fieldName === 'type' || fieldName === 'categorie') {
      appliedTypeValue = value;
    }
  }

  const typeIconValue = appliedTypeValue || getPrimaryTypeIconValue(category.id, suggestions);
  if (typeIconValue) {
    updatePlaceNameFieldIcon(form, category.id, typeIconValue);
  }

  return typeIconValue;
}

function inferCountryFromAddress(address) {
  if (!address?.trim()) return null;
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

export function applyPlaceToForm(form, category, place, {
  sourceUrl = '',
  onlyEmptyFields = false,
  showFieldSuggestions = true,
  autoApplyFieldSuggestions = false,
  silentNameUpdate = false,
} = {}) {
  if (!form || !place) return null;

  const addressFieldName = getPlaceAddressFieldName(category);
  const placeSearchField = getPlaceSearchField(category);
  const placeNameFieldDef = getPlaceNameField(category);
  const nameField = placeNameFieldDef ? form.elements[placeNameFieldDef.name] : form.elements.nom;
  const fills = placeSearchField?.placeSearch?.fills || {};

  const name = place.name?.trim() || '';
  const placeId = place.placeId?.replace(/^places\//, '') || null;
  const enriched = {
    ...place,
    name,
    placeId,
    mapsUrl: sourceUrl?.trim()
      || (placeId ? buildPlaceIdMapsUrl(placeId) : '')
      || place.mapsUrl
      || buildGoogleMapsUrl({
        name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      }),
    country: place.country?.trim() || inferCountryFromAddress(place.address),
  };

  if (nameField && enriched.name && shouldWriteField(nameField, onlyEmptyFields)) {
    nameField.value = enriched.name;
    if (!silentNameUpdate) {
      nameField.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  if (addressFieldName) {
    const addressInput = form.elements[addressFieldName];
    if (addressInput && shouldWriteField(addressInput, onlyEmptyFields)) {
      addressInput.dataset.suppressAutocomplete = '1';
      addressInput.value = enriched.address || enriched.name || '';
      addressInput.dataset.lat = enriched.lat ?? '';
      addressInput.dataset.lng = enriched.lng ?? '';
      addressInput.dataset.mapsUrl = enriched.mapsUrl ?? '';
      delete addressInput.dataset.suppressAutocomplete;
    }
  }

  const hasPriceFields = form.elements.prixMin || form.elements.prixMax;
  const canFillPrice = !onlyEmptyFields
    || (!form.elements.prixMin?.value?.trim() && !form.elements.prixMax?.value?.trim());

  if (hasPriceFields && canFillPrice) {
    populatePriceRangeFields(form, {
      prixMin: enriched.prixMin ?? null,
      prixMax: enriched.prixMax ?? null,
    });
  }

  for (const [fieldName, placeKey] of Object.entries(fills)) {
    const target = form.elements[fieldName];
    if (!target || enriched[placeKey] == null) continue;
    if (!shouldWriteField(target, onlyEmptyFields)) continue;
    target.value = enriched[placeKey];
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }

  let appliedTypeValue = null;

  if (supportsPlaceFieldSuggestions(category?.id)) {
    if (autoApplyFieldSuggestions) {
      clearPlaceFieldSuggestions(form);
      appliedTypeValue = autoApplyPlaceFieldSuggestions(form, category, enriched, { onlyEmptyFields });
    } else if (showFieldSuggestions) {
      showPlaceFieldSuggestions(form, category, enriched);
    } else {
      clearPlaceFieldSuggestions(form);
    }
  }

  form.dispatchEvent(new Event('input', { bubbles: true }));
  return { ...enriched, appliedTypeValue };
}
