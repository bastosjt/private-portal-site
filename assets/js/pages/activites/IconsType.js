/**
 * Icônes par type d'activité — clé = value du champ `categorie` (config.js).
 * Valeur = nom Lucide (voir https://lucide.dev/icons).
 *
 * Pour ajouter un type : importer l'icône ci-dessous et l'enregistrer dans ICON_REGISTRY.
 */
import {
  BicepsFlexed,
  Castle,
  Footprints,
  Landmark,
  Mountain,
  Music,
  Popcorn,
  Puzzle,
  RollerCoaster,
  Sparkles,
  Tickets,
} from '../../vendor/lucide.mjs';
import { renderLucideIcon } from '../../lib/lucide-icon.js';

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
};

export function getActivityTypeLucideIcon(categoryValue) {
  const iconName = ACTIVITY_TYPE_ICONS[categoryValue] || 'activity';
  return ICON_REGISTRY[iconName] || RollerCoaster;
}

export function renderActivityTypeIcon(categoryValue, options = {}) {
  const Icon = getActivityTypeLucideIcon(categoryValue);
  return renderLucideIcon(Icon, { strokeWidth: 2, ...options });
}
