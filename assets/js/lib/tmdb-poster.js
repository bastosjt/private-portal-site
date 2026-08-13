const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function buildTmdbPosterUrl(posterPath, { width = 780 } = {}) {
  if (!posterPath || typeof posterPath !== 'string' || !posterPath.startsWith('/')) return null;
  return `${TMDB_IMAGE_BASE}/w${width}${posterPath}`;
}

export function getMoviePosterUrl(item) {
  return buildTmdbPosterUrl(item?.posterPath);
}

export function canLoadMoviePoster(item) {
  return Boolean(getMoviePosterUrl(item));
}
