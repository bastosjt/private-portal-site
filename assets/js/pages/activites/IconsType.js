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
  Footprints,
  Landmark,
  Mountain,
  Music,
  Popcorn,
  Puzzle,
  RollerCoaster,
  Sparkles,
  Tickets,
  Trees,
} from '../../vendor/lucide.mjs';
import { renderLucideIcon } from '../../lib/lucide-icon.js';
import { BotanicalGarden, Fountain, Place } from './custom-type-icons.js';

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
  'botanical-garden': BotanicalGarden,
  activity: RollerCoaster,
};

const ACTIVITY_TYPE_ICONS = {
  musee: 'landmark',
  site_touristique: 'landmark',
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
  jardin_botanique: 'botanical-garden',
  eglise: 'church',
  cathedrale: 'church',
  eglise_cathedrale: 'church',
  fontaine: 'fountain',
  place: 'place',
};

export function getActivityTypeLucideIcon(categoryValue) {
  const iconName = ACTIVITY_TYPE_ICONS[categoryValue] || 'activity';
  return ICON_REGISTRY[iconName] || RollerCoaster;
}

export function renderActivityTypeIcon(categoryValue, options = {}) {
  const Icon = getActivityTypeLucideIcon(categoryValue);
  return renderLucideIcon(Icon, { strokeWidth: 2, ...options });
}
