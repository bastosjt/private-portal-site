/**
 * Icônes par type de restaurant — clé = value du champ `type` (config.js).
 * Valeur = nom Lucide (voir https://lucide.dev/icons).
 */
import {
  Beer,
  CakeSlice,
  Coffee,
  Cookie,
  Croissant,
  IceCreamCone,
  Martini,
  PaperBag,
  UtensilsCrossed,
} from '../../vendor/lucide.mjs';
import { renderLucideIcon } from '../../lib/lucide-icon.js';

const ICON_REGISTRY = {
  'utensils-crossed': UtensilsCrossed,
  'paper-bag': PaperBag,
  beer: Beer,
  coffee: Coffee,
  martini: Martini,
  croissant: Croissant,
  'cake-slice': CakeSlice,
  cookie: Cookie,
  'ice-cream-cone': IceCreamCone,
};

const RESTAURANT_TYPE_ICONS = {
  restaurant: 'utensils-crossed',
  cafe: 'coffee',
  brasserie: 'beer',
  bar_a_cocktail: 'martini',
  boulangerie: 'croissant',
  patisserie: 'cake-slice',
  marchand_de_cookie: 'cookie',
  glacier: 'ice-cream-cone',
  fast_food: 'paper-bag',
  restauration_rapide: 'paper-bag',
};

export function getRestaurantTypeLucideIcon(typeValue) {
  const iconName = RESTAURANT_TYPE_ICONS[typeValue] || 'utensils-crossed';
  return ICON_REGISTRY[iconName] || UtensilsCrossed;
}

export function renderRestaurantTypeIcon(typeValue, options = {}) {
  const Icon = getRestaurantTypeLucideIcon(typeValue);
  return renderLucideIcon(Icon, { strokeWidth: 2, ...options });
}
