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
import { renderLucideIcon } from '../../lib/lucide-icon.js';

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

const ACTIVITY_TYPE_ICONS = {
  musee: 'landmark',
  expo: 'tickets',
  balade: 'footprints',
  escape_game: 'puzzle',
  concert: 'music',
  cinema: 'popcorn',
  feux_d_artifice: 'sparkles',
  sport: 'biceps-flexed',
};

export function renderActivityTypeIcon(categoryValue, options = {}) {
  const iconName = ACTIVITY_TYPE_ICONS[categoryValue] || 'activity';
  const Icon = ICON_REGISTRY[iconName] || RollerCoaster;
  return renderLucideIcon(Icon, { strokeWidth: 2, ...options });
}
