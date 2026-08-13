/**
 * Icônes par type — clé = value du champ `type` (config.js movies.fields).
 */
import { Film, TvMinimalPlay } from '../../vendor/lucide.mjs';
import { createTypeIconRenderer } from '../shared/createTypeIconRenderer.js';

const ICON_REGISTRY = {
  film: Film,
  tv: TvMinimalPlay,
};

const MOVIE_TYPE_ICONS = {
  film: 'film',
  serie: 'tv',
};

const { renderTypeIcon } = createTypeIconRenderer({
  iconRegistry: ICON_REGISTRY,
  typeMap: MOVIE_TYPE_ICONS,
  defaultIconKey: 'film',
  defaultIcon: Film,
});

export const renderMovieTypeIcon = renderTypeIcon;
