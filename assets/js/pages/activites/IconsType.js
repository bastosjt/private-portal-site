/**
 * Icônes par type d'activité — clé = value du champ `categorie` (config.js).
 * Valeur = nom Lucide (voir https://lucide.dev/icons) ou icône custom.
 *
 * Pour ajouter un type : importer l'icône et l'enregistrer dans ICON_REGISTRY.
 */
import {
  BicepsFlexed,
  Castle,
  Church,
  Flower2,
  Footprints,
  Landmark,
  Mountain,
  Music,
  Parasol,
  Popcorn,
  Puzzle,
  RollerCoaster,
  Ship,
  ShoppingBag,
  Sparkles,
  Tickets,
  Trees,
} from '../../vendor/lucide.mjs';
import { renderLucideIcon } from '../../lib/lucide-icon.js';
import { Bridge, Fountain, Monument, Place, Ruins } from './custom-type-icons.js';

const ICON_REGISTRY = {
  landmark: Landmark,
  castle: Castle,
  tickets: Tickets,
  footprints: Footprints,
  puzzle: Puzzle,
  music: Music,
  popcorn: Popcorn,
  sparkles: Sparkles,
  'biceps-flexed': BicepsFlexed,
  mountain: Mountain,
  trees: Trees,
  church: Church,
  fountain: Fountain,
  place: Place,
  'flower-2': Flower2,
  'shopping-bag': ShoppingBag,
  monument: Monument,
  bridge: Bridge,
  ruins: Ruins,
  parasol: Parasol,
  ship: Ship,
  activity: RollerCoaster,
};

const ACTIVITY_TYPE_ICONS = {
  musee: 'landmark',
  chateau: 'castle',
  expo: 'tickets',
  balade: 'footprints',
  escape_game: 'puzzle',
  concert: 'music',
  cinema: 'popcorn',
  feux_d_artifice: 'sparkles',
  sport: 'biceps-flexed',
  sommet: 'mountain',
  parc: 'trees',
  jardin_botanique: 'flower-2',
  centre_commercial: 'shopping-bag',
  monument: 'monument',
  pont: 'bridge',
  site_historique: 'ruins',
  eglise: 'church',
  cathedrale: 'church',
  eglise_cathedrale: 'church',
  fontaine: 'fountain',
  place: 'place',
  plage: 'parasol',
  port: 'ship',
};

export function getActivityTypeLucideIcon(categoryValue) {
  const iconName = ACTIVITY_TYPE_ICONS[categoryValue] || 'activity';
  return ICON_REGISTRY[iconName] || RollerCoaster;
}

export function renderActivityTypeIcon(categoryValue, options = {}) {
  const Icon = getActivityTypeLucideIcon(categoryValue);
  return renderLucideIcon(Icon, { strokeWidth: 2, ...options });
}
