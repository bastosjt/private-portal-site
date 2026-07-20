/** Logs développeur — silencieux en production (F12 plus propre). */
export function isDevEnvironment() {
  if (typeof location === 'undefined') return false;
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return true;
  return new URLSearchParams(location.search).has('debug');
}

export function devWarn(...args) {
  if (isDevEnvironment()) console.warn(...args);
}

export function devError(...args) {
  if (isDevEnvironment()) console.error(...args);
}
