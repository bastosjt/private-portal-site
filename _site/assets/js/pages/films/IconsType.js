/**
 * Icônes par type — clé = value du champ `type` (config.js movies.fields).
 */
import { Film, TvMinimalPlay } from '../../vendor/lucide.mjs';
import { renderLucideIcon } from '../../lib/lucide-icon.js';

const ICON_REGISTRY = {
  film: Film,
  tv: TvMinimalPlay,
};

const MOVIE_TYPE_ICONS = {
  film: 'film',
  serie: 'tv',
};

export function renderMovieTypeIcon(typeValue, options = {}) {
  const iconName = MOVIE_TYPE_ICONS[typeValue] || 'film';
  const Icon = ICON_REGISTRY[iconName] || Film;
  return renderLucideIcon(Icon, { strokeWidth: 2, ...options });
}
