/**
 * Icônes par type d'activité — clé = value du champ `categorie` (config.js).
 * Valeur = nom Lucide (voir https://lucide.dev/icons).
 *
 * Pour ajouter un type : importer l'icône ci-dessous et l'enregistrer dans ICON_REGISTRY.
 */
import {
  BicepsFlexed,
  Footprints,
  Landmark,
  Music,
  Popcorn,
  Puzzle,
  RollerCoaster,
  Sparkles,
  Tickets,
} from 'https://esm.sh/lucide@1.23.0';
import { renderLucideIcon } from '../utils/lucide-icon.js';

const ICON_REGISTRY = {
  landmark: Landmark,
  tickets: Tickets,
  footprints: Footprints,
  puzzle: Puzzle,
  music: Music,
  popcorn: Popcorn,
  sparkles: Sparkles,
  'biceps-flexed': BicepsFlexed,
  activity: RollerCoaster,
};

export const ACTIVITY_TYPE_ICONS = {
  site_touristique: 'landmark',
  musee: 'landmark',
  expo: 'tickets',
  balade: 'footprints',
  escape_game: 'puzzle',
  concert: 'music',
  cinema: 'popcorn',
  feux_d_artifice: 'sparkles',
  feux_d_artifices: 'sparkles',
  sport: 'biceps-flexed',
};

export function getActivityTypeIconName(categoryValue) {
  if (!categoryValue) return null;
  return ACTIVITY_TYPE_ICONS[categoryValue] || null;
}

export function renderActivityTypeIcon(categoryValue, options = {}) {
  const iconName = ACTIVITY_TYPE_ICONS[categoryValue] || 'activity';
  const Icon = ICON_REGISTRY[iconName] || RollerCoaster;
  return renderLucideIcon(Icon, { strokeWidth: 2, ...options });
}
