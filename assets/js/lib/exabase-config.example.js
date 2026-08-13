/** Copier en exabase-config.js — clé API Exabase (console.exabase.io → API keys). */
export const EXABASE_API_KEY = '';

export function isExabaseConfigured() {
  return Boolean(EXABASE_API_KEY?.trim());
}
