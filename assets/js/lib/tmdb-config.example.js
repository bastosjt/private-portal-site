/** Copier en tmdb-config.js — token lecture API TMDB (themoviedb.org/settings/api). */
export const TMDB_READ_ACCESS_TOKEN = '';

export function isTmdbConfigured() {
  return Boolean(TMDB_READ_ACCESS_TOKEN?.trim());
}
