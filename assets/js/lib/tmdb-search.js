import { TMDB_READ_ACCESS_TOKEN, isTmdbConfigured } from './tmdb-config.js';
import { trackApiRequest } from './api-usage-tracker.js';
import { devWarn } from './dev-log.js';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const searchCache = new Map();

function buildTmdbHeaders() {
  return {
    Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}`,
    Accept: 'application/json',
  };
}

function formatMediaYear(dateStr) {
  if (!dateStr) return '';
  const year = dateStr.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : '';
}

function normalizeSearchResult(item, mediaType) {
  const isMovie = mediaType === 'movie';

  return {
    id: item.id,
    mediaType,
    title: (isMovie ? item.title : item.name)?.trim() || '',
    releaseDate: isMovie ? item.release_date : item.first_air_date,
    year: formatMediaYear(isMovie ? item.release_date : item.first_air_date),
    overview: item.overview?.trim() || '',
    posterPath: item.poster_path || null,
    genreIds: Array.isArray(item.genre_ids) ? item.genre_ids : [],
    popularity: Number(item.popularity) || 0,
  };
}

function normalizeMediaDetails(item, mediaType) {
  const isMovie = mediaType === 'movie';
  const genres = Array.isArray(item.genres)
    ? item.genres.map((genre) => genre.id).filter(Number.isFinite)
    : [];

  return {
    id: item.id,
    mediaType,
    title: (isMovie ? item.title : item.name)?.trim() || '',
    releaseDate: isMovie ? item.release_date : item.first_air_date,
    year: formatMediaYear(isMovie ? item.release_date : item.first_air_date),
    overview: item.overview?.trim() || '',
    posterPath: item.poster_path || null,
    genreIds: genres.length ? genres : [],
    popularity: Number(item.popularity) || 0,
  };
}

function getCacheKey(query) {
  return query.trim().toLowerCase();
}

function readSearchCache(query) {
  const key = getCacheKey(query);
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry.results;
}

function writeSearchCache(query, results) {
  searchCache.set(getCacheKey(query), {
    at: Date.now(),
    results,
  });
}

export function peekMovieSearchCache(query) {
  return readSearchCache(query);
}

async function fetchSearchEndpoint(endpoint, query, { signal } = {}) {
  const url = new URL(`${TMDB_API_BASE}/${endpoint}`);
  url.searchParams.set('query', query.trim());
  url.searchParams.set('language', 'fr-FR');
  url.searchParams.set('include_adult', 'false');
  url.searchParams.set('page', '1');

  const response = await fetch(url, {
    headers: buildTmdbHeaders(),
    signal,
  });

  if (!response.ok) {
    devWarn(`tmdb ${endpoint}:`, response.status);
    return [];
  }

  trackApiRequest('tmdb');

  const data = await response.json();
  return data.results || [];
}

export async function searchMoviesAndSeries(query, { signal, page = 1 } = {}) {
  if (!isTmdbConfigured() || !query?.trim()) return [];

  if (page !== 1) {
    return searchMoviesAndSeriesLegacy(query, { signal, page });
  }

  const cached = readSearchCache(query);
  if (cached) return cached;

  const trimmed = query.trim();

  const [movieItems, tvItems] = await Promise.all([
    fetchSearchEndpoint('search/movie', trimmed, { signal }),
    fetchSearchEndpoint('search/tv', trimmed, { signal }),
  ]);

  const merged = [
    ...movieItems.map((item) => normalizeSearchResult(item, 'movie')),
    ...tvItems.map((item) => normalizeSearchResult(item, 'tv')),
  ]
    .filter((item) => item.title)
    .sort((a, b) => b.popularity - a.popularity || a.title.localeCompare(b.title, 'fr'));

  writeSearchCache(query, merged);
  return merged;
}

async function searchMoviesAndSeriesLegacy(query, { signal, page = 1 } = {}) {
  const url = new URL(`${TMDB_API_BASE}/search/multi`);
  url.searchParams.set('query', query.trim());
  url.searchParams.set('language', 'fr-FR');
  url.searchParams.set('include_adult', 'false');
  url.searchParams.set('page', String(page));

  const response = await fetch(url, {
    headers: buildTmdbHeaders(),
    signal,
  });

  if (!response.ok) {
    devWarn('tmdb search:', response.status);
    return [];
  }

  trackApiRequest('tmdb');

  const data = await response.json();

  return (data.results || [])
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .map((item) => normalizeSearchResult(item, item.media_type))
    .filter((item) => item.title);
}

export async function retrieveMediaDetails({ id, mediaType }, { signal } = {}) {
  if (!isTmdbConfigured() || !id || !mediaType) return null;

  const path = mediaType === 'tv' ? `tv/${id}` : `movie/${id}`;
  const url = new URL(`${TMDB_API_BASE}/${path}`);
  url.searchParams.set('language', 'fr-FR');

  const response = await fetch(url, {
    headers: buildTmdbHeaders(),
    signal,
  });

  if (!response.ok) {
    devWarn('tmdb media details:', response.status);
    return null;
  }

  trackApiRequest('tmdb');

  const data = await response.json();
  return normalizeMediaDetails(data, mediaType);
}
