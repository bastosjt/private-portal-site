/** Champs formulaire partagés : recherche Google Places (restaurants, activités…). */

export const PLACE_PRICE_FIELD = {
  name: 'prix',
  label: 'Prix estimé',
  type: 'priceRange',
  placeholderMin: 'Min',
  placeholderMax: 'Max',
};

export const PLACE_TRAVEL_FIELD = {
  name: 'travelId',
  label: 'Voyage associé',
  type: 'select',
  optionsFrom: 'travels',
};

export function createPlaceMapsUrlField() {
  return {
    name: 'mapsImportUrl',
    label: 'Lien Google Maps (optionnel)',
    type: 'url',
    optional: true,
    placeholder: 'https://maps.google.com/…',
    urlImport: {
      provider: 'googleMaps',
    },
  };
}

export function createPlaceNameField(placeholder, addressField) {
  return {
    name: 'nom',
    label: 'Nom',
    type: 'text',
    required: true,
    placeholder,
    placeSearch: { addressField },
  };
}

export function createTravelLocationField(placeholder = 'Ex. Lisbonne, Provence, Japon…') {
  return {
    name: 'localisation',
    label: 'Destination',
    type: 'address',
    required: true,
    placeholder,
    placeSearch: {
      addressField: 'localisation',
      mode: 'geographic',
      fills: { pays: 'country' },
    },
    fills: { pays: 'country' },
  };
}

export function createPlaceAddressField(name, label, placeholder) {
  return {
    name,
    label,
    type: 'address',
    placeholder,
  };
}

export function getPlaceSearchField(category) {
  return category?.fields?.find((field) => field.placeSearch) ?? null;
}

function getPlaceTitleFieldName(placeSearchField) {
  if (!placeSearchField?.placeSearch) return null;

  for (const [fieldName, placeKey] of Object.entries(placeSearchField.placeSearch.fills || {})) {
    if (placeKey === 'name') return fieldName;
  }

  if (placeSearchField.type !== 'address') return placeSearchField.name;
  return null;
}

export function getPlaceNameField(category) {
  const field = getPlaceSearchField(category);
  if (!field) return null;

  if (field.type === 'address') {
    const titleFieldName = getPlaceTitleFieldName(field);
    if (!titleFieldName) return null;
    return { name: titleFieldName, placeSearch: field.placeSearch, sourceField: field };
  }

  return field;
}

export function getPlaceAddressFieldName(category) {
  const placeField = getPlaceSearchField(category);
  if (placeField?.placeSearch?.addressField) return placeField.placeSearch.addressField;
  return category?.fields?.find((field) => field.type === 'address')?.name ?? null;
}

export function isPlaceLinkedAddressField(category, field) {
  if (!field || field.type !== 'address') return false;
  return field.name === getPlaceAddressFieldName(category);
}
