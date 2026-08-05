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

export function createPlaceAddressField(name, label, placeholder) {
  return {
    name,
    label,
    type: 'address',
    placeholder,
  };
}

export function getPlaceNameField(category) {
  return category?.fields?.find((field) => field.placeSearch) ?? null;
}

export function getPlaceAddressFieldName(category) {
  const placeField = getPlaceNameField(category);
  if (placeField?.placeSearch?.addressField) return placeField.placeSearch.addressField;
  return category?.fields?.find((field) => field.type === 'address')?.name ?? null;
}

export function isPlaceLinkedAddressField(category, field) {
  if (!field || field.type !== 'address') return false;
  return field.name === getPlaceAddressFieldName(category);
}
