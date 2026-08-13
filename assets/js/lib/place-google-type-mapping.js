import { getCategoryFieldOptions } from './custom-types.js';

/** Types Google (New) → slug `restaurants.type` (uniquement si présent dans l'app). */
const GOOGLE_TYPE_TO_APP = {
  cafe: 'cafe',
  coffee_shop: 'cafe',
  coffee_stand: 'cafe',
  cat_cafe: 'cafe',
  dog_cafe: 'cafe',
  bakery: 'boulangerie',
  ice_cream_shop: 'glacier',
  cocktail_bar: 'bar_a_cocktail',
  wine_bar: 'bar_a_cocktail',
  lounge_bar: 'bar_a_cocktail',
  hookah_bar: 'bar_a_cocktail',
  fast_food_restaurant: 'fast_food',
  meal_takeaway: 'fast_food',
  hamburger_restaurant: 'fast_food',
  hot_dog_restaurant: 'fast_food',
  steak_house: 'steak_house',
  chinese_noodle_restaurant: 'restaurant_de_nouilles',
  ramen_restaurant: 'restaurant_de_nouilles',
  donut_shop: 'patisserie',
  cake_shop: 'patisserie',
  dessert_shop: 'patisserie',
  chocolate_shop: 'patisserie',
  confectionery: 'patisserie',
  candy_store: 'marchand_de_cookie',
  brasserie: 'brasserie',
  bistro: 'brasserie',
  beer_garden: 'brasserie',
  restaurant: 'restaurant',
  fine_dining_restaurant: 'restaurant_gastronomique',
  family_restaurant: 'restaurant',
  buffet_restaurant: 'restaurant',
  breakfast_restaurant: 'restaurant',
  brunch_restaurant: 'restaurant',
};

/** Slugs Google cuisine (`*_restaurant`) → slug `restaurants.cuisine`. */
const GOOGLE_CUISINE_RESTAURANT_TO_APP = {
  thai_restaurant: 'thailandaise',
  chinese_restaurant: 'chinoise',
  cantonese_restaurant: 'chinoise',
  dim_sum_restaurant: 'chinoise',
  dumpling_restaurant: 'chinoise',
  french_restaurant: 'francaise',
  italian_restaurant: 'italienne',
  japanese_restaurant: 'japonaise',
  japanese_izakaya_restaurant: 'japonaise',
  japanese_curry_restaurant: 'japonaise',
  mexican_restaurant: 'mexicaine',
  burrito_restaurant: 'mexicaine',
};

/** Tokens extraits des slugs Google → slug `restaurants.cuisine`. */
const CUISINE_TOKEN_TO_APP = {
  thai: 'thailandaise',
  chinese: 'chinoise',
  cantonese: 'chinoise',
  dim_sum: 'chinoise',
  dumpling: 'chinoise',
  french: 'francaise',
  italian: 'italienne',
  japanese: 'japonaise',
  izakaya: 'japonaise',
  sushi: 'japonaise',
  mexican: 'mexicaine',
  burrito: 'mexicaine',
};

const GENERIC_RESTAURANT_TYPE = 'restaurant';

/** Types Google (New) → slug `activities.categorie`. */
const GOOGLE_ACTIVITY_TYPE_TO_APP = {
  museum: 'musee',
  art_gallery: 'musee',
  aquarium: 'aquarium',
  monument: 'monument',
  cultural_landmark: 'monument',
  lighthouse: 'monument',
  historical_landmark: 'site_historique',
  park: 'parc',
  national_park: 'parc',
  state_park: 'parc',
  city_park: 'parc',
  amusement_park: 'parc',
  zoo: 'zoo',
  botanical_garden: 'jardin_botanique',
  movie_theater: 'cinema',
  stadium: 'sport',
  sports_complex: 'sport',
  sports_club: 'sport',
  gym: 'sport',
  fitness_center: 'sport',
  bowling_alley: 'sport',
  golf_course: 'sport',
  ice_skating_rink: 'sport',
  swimming_pool: 'sport',
  ski_resort: 'sport',
  shopping_mall: 'centre_commercial',
  church: 'eglise',
  catholic_church: 'eglise',
  cathedral: 'cathedrale',
  plaza: 'place',
  town_square: 'place',
  beach: 'plage',
  marina: 'port',
  ferry_terminal: 'port',
  pier: 'port',
  performing_arts_theater: 'concert',
  concert_hall: 'concert',
  opera_house: 'concert',
  event_venue: 'concert',
  convention_center: 'expo',
  tourist_attraction: 'monument',
  bridge: 'pont',
  fountain: 'fontaine',
};

const GENERIC_ACTIVITY_TYPES = new Set([
  'tourist_attraction',
  'point_of_interest',
  'establishment',
  'locality',
  'premise',
]);

export const PLACE_SUGGESTION_CATEGORY_IDS = ['restaurants', 'activities'];

export function supportsPlaceFieldSuggestions(categoryId) {
  return PLACE_SUGGESTION_CATEGORY_IDS.includes(categoryId);
}

export function getPlaceSuggestionFieldNames(categoryId) {
  if (categoryId === 'restaurants') return ['type', 'cuisine'];
  if (categoryId === 'activities') return ['categorie'];
  return [];
}

function buildAllowedValues(categoryId, fieldName) {
  return new Set(
    getCategoryFieldOptions(categoryId, fieldName).map((option) => option.value),
  );
}

function collectGoogleTypes({ primaryType, types } = {}) {
  const ordered = [];
  if (primaryType) ordered.push(primaryType);
  if (Array.isArray(types)) ordered.push(...types);
  return [...new Set(ordered.filter(Boolean))];
}

function resolveSuggestedType(googleTypes, allowedTypes) {
  const priorityGoogleTypes = ['fine_dining_restaurant'];
  for (const googleType of priorityGoogleTypes) {
    if (!googleTypes.includes(googleType)) continue;
    const mapped = GOOGLE_TYPE_TO_APP[googleType];
    if (mapped && allowedTypes.has(mapped)) return mapped;
  }

  for (const googleType of googleTypes) {
    const mapped = GOOGLE_TYPE_TO_APP[googleType];
    if (!mapped || mapped === GENERIC_RESTAURANT_TYPE) continue;
    if (allowedTypes.has(mapped)) return mapped;
  }

  for (const googleType of googleTypes) {
    const mapped = GOOGLE_TYPE_TO_APP[googleType];
    if (mapped === GENERIC_RESTAURANT_TYPE && allowedTypes.has(GENERIC_RESTAURANT_TYPE)) {
      return GENERIC_RESTAURANT_TYPE;
    }
  }

  return null;
}

function resolveCuisineFromGoogleType(googleType, allowedCuisines) {
  if (GOOGLE_TYPE_TO_APP[googleType] && GOOGLE_TYPE_TO_APP[googleType] !== GENERIC_RESTAURANT_TYPE) {
    return null;
  }

  const direct = GOOGLE_CUISINE_RESTAURANT_TO_APP[googleType];
  if (direct && allowedCuisines.has(direct)) return direct;

  const tokens = googleType.replace(/_restaurant$/, '').split('_').filter(Boolean);
  for (const token of tokens) {
    const mapped = CUISINE_TOKEN_TO_APP[token];
    if (mapped && allowedCuisines.has(mapped)) return mapped;
  }

  return null;
}

function resolveSuggestedCuisine(googleTypes, allowedCuisines) {
  for (const googleType of googleTypes) {
    const mapped = resolveCuisineFromGoogleType(googleType, allowedCuisines);
    if (mapped) return mapped;
  }
  return null;
}

function resolveSuggestedActivityCategory(googleTypes, allowedCategories) {
  for (const googleType of googleTypes) {
    if (GENERIC_ACTIVITY_TYPES.has(googleType)) continue;
    const mapped = GOOGLE_ACTIVITY_TYPE_TO_APP[googleType];
    if (mapped && allowedCategories.has(mapped)) return mapped;
  }

  for (const googleType of googleTypes) {
    const mapped = GOOGLE_ACTIVITY_TYPE_TO_APP[googleType];
    if (mapped && allowedCategories.has(mapped)) return mapped;
  }

  return null;
}

/**
 * @param {{ primaryType?: string|null, types?: string[] }} googlePlace
 * @param {string} categoryId
 * @returns {Record<string, string|null>}
 */
export function resolvePlaceGoogleFieldSuggestions(googlePlace, categoryId) {
  const googleTypes = collectGoogleTypes(googlePlace);
  if (!googleTypes.length) return {};

  if (categoryId === 'restaurants') {
    const allowedTypes = buildAllowedValues(categoryId, 'type');
    const allowedCuisines = buildAllowedValues(categoryId, 'cuisine');

    return {
      type: resolveSuggestedType(googleTypes, allowedTypes),
      cuisine: resolveSuggestedCuisine(googleTypes, allowedCuisines),
    };
  }

  if (categoryId === 'activities') {
    const allowedCategories = buildAllowedValues(categoryId, 'categorie');

    return {
      categorie: resolveSuggestedActivityCategory(googleTypes, allowedCategories),
    };
  }

  return {};
}
