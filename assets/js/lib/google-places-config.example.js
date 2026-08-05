/** Copier en google-places-config.js — clé API Google Cloud avec Places API (New) activée. */
export const GOOGLE_PLACES_API_KEY = '';

export function isGooglePlacesConfigured() {
  return Boolean(GOOGLE_PLACES_API_KEY?.trim());
}
