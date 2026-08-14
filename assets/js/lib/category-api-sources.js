import { escapeHtml } from './escape-html.js';
import { isGooglePlacesConfigured } from './google-places-config.js';
import { isTmdbConfigured } from './tmdb-config.js';
import { isExabaseConfigured } from './exabase-config.js';
import { renderNavIcon } from './lucide-icon.js';
import {
  getApiUsage,
  getApiUsageServiceIdForName,
  getApiUsageSummary,
  onApiUsageChange,
} from './api-usage-tracker.js';
import {
  animateApiUsageEntrance,
  mountApiUsageDashboard,
  refreshApiUsageDashboard,
} from './api-usage-ui.js';

const CATEGORY_META = {
  accueil: { icon: 'home', theme: 'base' },
  carte: { icon: 'map', theme: 'emerald' },
  activites: { icon: 'activity', theme: 'cyan' },
  restaurants: { icon: 'restaurant', theme: 'rose' },
  films: { icon: 'film', theme: 'violet' },
  voyages: { icon: 'travel', theme: 'blue' },
  wishlist: { icon: 'wishlist', theme: 'pink' },
};

const SUMMARY_SERVICE_FILTER = {
  'google-places': () => isGooglePlacesConfigured(),
  tmdb: () => isTmdbConfigured(),
  exabase: () => isExabaseConfigured(),
  nominatim: () => true,
};

const USAGE_SERVICE_UI = {
  'google-places': { icon: 'map', theme: 'blue', shortName: 'Google Places' },
  tmdb: { icon: 'film', theme: 'violet', shortName: 'TMDB' },
  nominatim: { icon: 'layers', theme: 'emerald', shortName: 'OpenStreetMap' },
  exabase: { icon: 'search', theme: 'cyan', shortName: 'Exabase' },
};

function apiEntry(name, note, status, { usageServiceId = null } = {}) {
  return {
    name,
    note,
    statusKind: status.kind,
    statusText: status.text,
    usageServiceId: usageServiceId ?? getApiUsageServiceIdForName(name),
  };
}

function keyStatus(isConfigured, { optional = false } = {}) {
  if (isConfigured) return { kind: 'configured', text: 'Clé configurée' };
  if (optional) return { kind: 'optional', text: 'Optionnel' };
  return { kind: 'missing', text: 'Clé manquante' };
}

function publicStatus(text = 'Gratuit') {
  return { kind: 'public', text };
}

function localStatus(text = 'Intégré') {
  return { kind: 'neutral', text };
}

/** Sources externes utilisées par section de l'app (ordre d'affichage Paramètres). */
export function getCategoryApiSources() {
  const google = keyStatus(isGooglePlacesConfigured());
  const googleOptional = keyStatus(isGooglePlacesConfigured(), { optional: true });
  const tmdb = keyStatus(isTmdbConfigured());
  const exabase = keyStatus(isExabaseConfigured(), { optional: true });

  return [
    {
      id: 'accueil',
      label: 'Accueil',
      apis: [
        apiEntry('Firebase Firestore', 'Listes, profils, synchro', localStatus('Actif')),
        apiEntry('Google Places API', 'Lieux à proximité sur la carte', googleOptional),
      ],
    },
    {
      id: 'carte',
      label: 'Carte interactive',
      apis: [
        apiEntry('Carto basemaps', 'Tuiles vectorielles', publicStatus()),
        apiEntry('MapLibre GL', 'Moteur de carte', localStatus()),
        apiEntry('Nominatim (OpenStreetMap)', 'Contours des zones voyage', publicStatus()),
        apiEntry('Google Places API', 'Photos et détails des lieux', google),
        apiEntry('Firebase Firestore', 'Marqueurs et filtres', localStatus('Actif')),
      ],
    },
    {
      id: 'activites',
      label: 'Activités',
      apis: [
        apiEntry('Google Places API', 'Autocomplétion, fiche lieu, photos', google),
        apiEntry('Exabase', 'Import lien Google Maps (optionnel)', exabase),
        apiEntry('Frankfurter', 'Conversion des prix en €', publicStatus()),
        apiEntry('Firebase Firestore', 'Stockage', localStatus('Actif')),
      ],
    },
    {
      id: 'restaurants',
      label: 'Restaurants',
      apis: [
        apiEntry('Google Places API', 'Autocomplétion, fiche lieu, photos', google),
        apiEntry('Exabase', 'Import lien Google Maps (optionnel)', exabase),
        apiEntry('Frankfurter', 'Conversion des prix en €', publicStatus()),
        apiEntry('Firebase Firestore', 'Stockage', localStatus('Actif')),
      ],
    },
    {
      id: 'films',
      label: 'Films & Séries',
      apis: [
        apiEntry('TMDB', 'Recherche titre, affiches, métadonnées', tmdb),
        apiEntry('Firebase Firestore', 'Stockage', localStatus('Actif')),
      ],
    },
    {
      id: 'voyages',
      label: 'Voyages',
      apis: [
        apiEntry('Google Places API', 'Destination, photos, autocomplétion', google),
        apiEntry('Exabase', 'Import lien Google Maps (optionnel)', exabase),
        apiEntry('Nominatim (OpenStreetMap)', 'Contours sur la carte', publicStatus()),
        apiEntry('Firebase Firestore', 'Stockage', localStatus('Actif')),
      ],
    },
    {
      id: 'wishlist',
      label: 'Wishlist',
      apis: [
        apiEntry('Firebase Firestore', 'Stockage (saisie manuelle)', localStatus('Actif')),
      ],
    },
  ];
}

function renderApiBadge(statusKind, statusText) {
  return `<span class="settings-api-badge settings-api-badge--${escapeHtml(statusKind)}">${escapeHtml(statusText)}</span>`;
}

function getVisibleUsageSummary() {
  return getApiUsageSummary().filter((usage) => {
    const isVisible = SUMMARY_SERVICE_FILTER[usage.id]?.() ?? true;
    return isVisible && (usage.limit != null || usage.count > 0);
  });
}

function buildUsageUiMap() {
  return Object.fromEntries(
    Object.entries(USAGE_SERVICE_UI).map(([id, ui]) => [
      id,
      { ...ui, iconHtml: renderNavIcon(ui.icon, { strokeWidth: 2, width: 15, height: 15 }) },
    ]),
  );
}

export function updateApiUsageMetrics({ animate = true } = {}) {
  const summary = getVisibleUsageSummary();
  if (!summary.length) return;
  hydrateApiUsageDashboard(summary, buildUsageUiMap(), { animate, entrance: false });
}

export function renderApiUsageSummaryHtml() {
  const summary = getVisibleUsageSummary();
  if (!summary.length) return '';

  return `
    <article class="settings-panel settings-api-dashboard" id="settings-api-usage" data-theme="base">
      <div class="settings-panel-inner settings-api-dashboard-inner">
        <span class="cat-panel-accent" aria-hidden="true"></span>
        <header class="settings-api-dashboard-head">
          <span class="settings-api-dashboard-icon" aria-hidden="true">${renderNavIcon('cloud-sync', { strokeWidth: 2, width: 18, height: 18 })}</span>
          <div class="settings-api-dashboard-copy">
            <h3 class="settings-api-dashboard-title">Consommation API</h3>
            <p class="settings-api-dashboard-sub">Synchronisé entre vos appareils</p>
          </div>
        </header>
        <div class="settings-api-compact-list"></div>
      </div>
    </article>
  `;
}

export function hydrateApiUsageDashboard(summary, uiMap, { animate = false, entrance = true } = {}) {
  const root = document.getElementById('settings-api-usage');
  if (!root || !summary.length) return;

  const updated = refreshApiUsageDashboard(root, summary, uiMap, { animate });

  if (!updated) {
    mountApiUsageDashboard(root, summary, uiMap);
  }

  if (entrance) {
    animateApiUsageEntrance(root);
  }
}

function renderApiRow(api) {
  return `
    <div class="settings-row settings-api-row">
      <div class="settings-row-text">
        <span class="settings-row-label">${escapeHtml(api.name)}</span>
        <span class="settings-row-value">${escapeHtml(api.note)}</span>
      </div>
      ${renderApiBadge(api.statusKind, api.statusText)}
    </div>
  `;
}

function renderCategoryPanel(category) {
  const meta = CATEGORY_META[category.id] || { icon: 'layers', theme: 'base' };
  const serviceCount = category.apis.length;
  const serviceLabel = serviceCount > 1 ? 'services' : 'service';
  const rows = category.apis.map(renderApiRow).join('');

  return `
    <article class="settings-panel settings-api-panel settings-panel--spaced" data-theme="${escapeHtml(meta.theme)}">
      <div class="settings-panel-inner settings-panel-inner--rows">
        <span class="cat-panel-accent" aria-hidden="true"></span>
        <div class="settings-row settings-api-panel-head">
          <span class="settings-row-leading" aria-hidden="true">${renderNavIcon(meta.icon, { strokeWidth: 2, width: 18, height: 18 })}</span>
          <div class="settings-row-text">
            <span class="settings-row-label">${escapeHtml(category.label)}</span>
            <span class="settings-row-value">${serviceCount} ${serviceLabel}</span>
          </div>
        </div>
        ${rows}
      </div>
    </article>
  `;
}

export function renderCategoryApiCatalogHtml() {
  const usageHtml = getVisibleUsageSummary().length ? renderApiUsageSummaryHtml() : '';
  return `${usageHtml}<div class="settings-api-catalog-list">${getCategoryApiSources().map(renderCategoryPanel).join('')}</div>`;
}

export function mountApiUsageSection({ animate = false } = {}) {
  const summary = getVisibleUsageSummary();
  if (!summary.length) return;
  hydrateApiUsageDashboard(summary, buildUsageUiMap(), { animate, entrance: !animate });
}

onApiUsageChange(() => {
  if (document.getElementById('settings-api-usage')) {
    updateApiUsageMetrics({ animate: true });
  }
});
