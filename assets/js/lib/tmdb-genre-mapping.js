/** Genres TMDB → slug `movies.genre` (uniquement si présent dans l'app). */
const TMDB_GENRE_TO_APP = {
  878: 'science_fiction',
  28: 'action',
  27: 'horreur',
  35: 'comedie',
  18: 'drame',
  10749: 'romantique',
  12: 'aventure',
  14: 'fantastique',
};

export function resolveAppGenreFromTmdb(genres = [], allowedGenres = null) {
  return resolveAppGenresFromTmdb(genres, allowedGenres, 1)[0] || null;
}

export function resolveAppGenresFromTmdb(genres = [], allowedGenres = null, limit = 2) {
  const ids = genres.map((genre) => (
    typeof genre === 'number' ? genre : genre?.id
  )).filter(Number.isFinite);

  const mapped = [];
  const seen = new Set();

  for (const id of ids) {
    const value = TMDB_GENRE_TO_APP[id];
    if (!value || seen.has(value)) continue;
    if (allowedGenres && !allowedGenres.has(value)) continue;
    mapped.push(value);
    seen.add(value);
    if (mapped.length >= limit) break;
  }

  return mapped;
}
