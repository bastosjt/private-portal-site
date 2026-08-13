/**
 * Icônes par type de restaurant — clé = value du champ `type` (config.js).
 */
import {
  Beef,
  Beer,
  CakeSlice,
  ChefHat,
  Coffee,
  Cookie,
  Croissant,
  IceCreamCone,
  Martini,
  PaperBag,
  UtensilsCrossed,
} from '../../vendor/lucide.mjs';
import { createTypeIconRenderer } from '../shared/createTypeIconRenderer.js';
import { Ramen } from './custom-type-icons.js';

const ICON_REGISTRY = {
  'utensils-crossed': UtensilsCrossed,
  'chef-hat': ChefHat,
  'paper-bag': PaperBag,
  beer: Beer,
  beef: Beef,
  coffee: Coffee,
  martini: Martini,
  croissant: Croissant,
  'cake-slice': CakeSlice,
  cookie: Cookie,
  'ice-cream-cone': IceCreamCone,
  ramen: Ramen,
};

const RESTAURANT_TYPE_ICONS = {
  restaurant: 'utensils-crossed',
  restaurant_gastronomique: 'chef-hat',
  gastronomique: 'chef-hat',
  cafe: 'coffee',
  brasserie: 'beer',
  bar_a_cocktail: 'martini',
  boulangerie: 'croissant',
  patisserie: 'cake-slice',
  marchand_de_cookie: 'cookie',
  glacier: 'ice-cream-cone',
  steak_house: 'beef',
  restaurant_de_nouilles: 'ramen',
  fast_food: 'paper-bag',
  restauration_rapide: 'paper-bag',
};

const { getTypeLucideIcon, renderTypeIcon } = createTypeIconRenderer({
  iconRegistry: ICON_REGISTRY,
  typeMap: RESTAURANT_TYPE_ICONS,
  defaultIconKey: 'utensils-crossed',
  defaultIcon: UtensilsCrossed,
});

export const getRestaurantTypeLucideIcon = getTypeLucideIcon;
export const renderRestaurantTypeIcon = renderTypeIcon;
