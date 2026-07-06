/**
 * Icônes par type de restaurant — clé = value du champ `type` (config.js).
 * Valeur = nom Lucide (voir https://lucide.dev/icons).
 */
import {
  Beer,
  Coffee,
  Martini,
  PaperBag,
  UtensilsCrossed,
} from 'https://esm.sh/lucide@1.23.0';
import { renderLucideIcon } from '../../lib/lucide-icon.js';

const ICON_REGISTRY = {
  'utensils-crossed': UtensilsCrossed,
  'paper-bag': PaperBag,
  beer: Beer,
  coffee: Coffee,
  martini: Martini,
};

const RESTAURANT_TYPE_ICONS = {
  restaurant: 'utensils-crossed',
  cafe: 'coffee',
  brasserie: 'beer',
  bar_a_cocktail: 'martini',
  fast_food: 'paper-bag',
  restauration_rapide: 'paper-bag',
};

export function renderRestaurantTypeIcon(typeValue, options = {}) {
  const iconName = RESTAURANT_TYPE_ICONS[typeValue] || 'utensils-crossed';
  const Icon = ICON_REGISTRY[iconName] || UtensilsCrossed;
  return renderLucideIcon(Icon, { strokeWidth: 2, ...options });
}
