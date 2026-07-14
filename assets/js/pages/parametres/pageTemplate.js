import { SETTINGS_THEME } from '../../config.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';

export const SETTINGS_VIEW_HTML = `
  <header class="page-header page-header--themed" data-theme="${SETTINGS_THEME}">
    <button type="button" class="btn-menu" id="menu-toggle" aria-label="Ouvrir le menu">
      ${renderNavIcon('menu', { strokeWidth: 1.75 })}
    </button>
    <div class="page-header-mobile-icon" data-theme="${SETTINGS_THEME}" aria-hidden="true">
      ${renderNavIcon('settings', { strokeWidth: 1.75 })}
    </div>
    <div class="page-header-content">
      <h1 class="page-header-title">Paramètres</h1>
      <p class="page-header-sub" id="settings-header-sub">Profil et espace</p>
    </div>
  </header>

  <main class="page-content settings-page" data-theme="${SETTINGS_THEME}">
    <section class="settings-section settings-section--profile" aria-labelledby="settings-profile-heading">
      <div class="section-head">
        <div>
          <h2 id="settings-profile-heading">Mon profil</h2>
          <p>Votre compte connecté</p>
        </div>
      </div>

      <article class="settings-panel settings-panel--profile">
        <div class="settings-panel-inner">
          <span class="cat-panel-accent" aria-hidden="true"></span>
          <div class="settings-profile-layout">
            <button type="button" class="settings-profile-avatar-btn" id="settings-avatar-btn" aria-label="Changer la photo de profil">
              <span class="settings-profile-avatar" id="settings-avatar" aria-hidden="true"></span>
            </button>
            <div class="settings-profile-info">
              <span class="settings-profile-badge">Connecté</span>
              <span class="settings-profile-name" id="settings-display-name"></span>
              <span class="settings-profile-email" id="settings-email"></span>
            </div>
          </div>
        </div>
      </article>

      <button type="button" class="settings-profile-side-card" id="settings-avatar-change">
        <span class="settings-profile-side-card-icon" id="settings-avatar-change-icon" aria-hidden="true"></span>
        <span class="settings-profile-side-card-text">
          <span class="settings-profile-side-card-label" id="settings-avatar-change-label">Choisir un animal</span>
          <span class="settings-profile-side-card-sub" id="settings-avatar-change-sub">Photo de profil</span>
        </span>
      </button>

      <button type="button" class="settings-profile-side-card" id="settings-display-name-change">
        <span class="settings-profile-side-card-icon" id="settings-display-name-icon" aria-hidden="true">${renderNavIcon('user-pen', { strokeWidth: 2, width: 20, height: 20 })}</span>
        <span class="settings-profile-side-card-text">
          <span class="settings-profile-side-card-label">Changer le pseudo</span>
          <span class="settings-profile-side-card-sub" id="settings-display-name-sub">Pseudo</span>
        </span>
      </button>
    </section>

    <section class="settings-section settings-section--love" data-theme="love" aria-labelledby="settings-space-heading">
      <div class="section-head">
        <div>
          <h2 id="settings-space-heading">Notre espace</h2>
          <p><strong id="settings-app-name"></strong> · <span id="settings-app-tagline"></span></p>
        </div>
      </div>

      <article class="settings-panel settings-panel--space">
        <div class="settings-panel-inner">
          <span class="cat-panel-accent" aria-hidden="true"></span>
          <div class="settings-space-stats">
            <div class="settings-space-stat">
              <span class="settings-space-stat-value" id="settings-days-count">0</span>
              <span class="settings-space-stat-label" id="settings-days-label">jours ensemble</span>
            </div>
            <p class="settings-space-since" id="settings-since-date"></p>
          </div>
          <div class="settings-members" id="settings-members" aria-label="Membres du couple"></div>
        </div>
      </article>

      <button type="button" class="settings-profile-side-card settings-profile-side-card--love" id="settings-partner-nickname-change">
        <span class="settings-profile-side-card-icon" aria-hidden="true">${renderNavIcon('user-pen', { strokeWidth: 2, width: 20, height: 20 })}</span>
        <span class="settings-profile-side-card-text">
          <span class="settings-profile-side-card-label">Surnom de votre copain adoré</span>
          <span class="settings-profile-side-card-sub" id="settings-partner-nickname-sub">Pas encore de surnom</span>
        </span>
      </button>

      <button type="button" class="settings-profile-side-card settings-profile-side-card--love" id="settings-space-tagline-change">
        <span class="settings-profile-side-card-icon" aria-hidden="true">${renderNavIcon('wishlist', { strokeWidth: 2, width: 20, height: 20 })}</span>
        <span class="settings-profile-side-card-text">
          <span class="settings-profile-side-card-label">Nom de notre espace</span>
          <span class="settings-profile-side-card-sub" id="settings-space-tagline-sub">À nous deux</span>
        </span>
      </button>
    </section>

    <section class="settings-section" aria-labelledby="settings-data-heading">
      <div class="section-head">
        <div>
          <h2 id="settings-data-heading">Données</h2>
          <p>Synchronisation avec Firestore</p>
        </div>
      </div>

      <article class="settings-panel">
        <div class="settings-panel-inner settings-panel-inner--rows">
          <span class="cat-panel-accent" aria-hidden="true"></span>
          <div class="settings-row">
            <div class="settings-row-text">
              <span class="settings-row-label">Dernière synchro</span>
              <span class="settings-row-value" id="settings-sync-status">—</span>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-text">
              <span class="settings-row-label">Éléments en cache</span>
              <span class="settings-row-value" id="settings-cache-count">-</span>
            </div>
          </div>
          <div class="settings-row settings-row--action">
            <button type="button" class="settings-btn" id="settings-clear-cache-btn">
              <span class="settings-btn-label">Vider le cache et recharger</span>
            </button>
          </div>
          <div class="settings-row settings-row--action">
            <button type="button" class="settings-btn" id="settings-sync-btn">
              <span class="settings-btn-icon" aria-hidden="true">${renderNavIcon('cloud-sync', { strokeWidth: 2 })}</span>
              <span class="settings-btn-label">Synchroniser maintenant</span>
            </button>
          </div>
        </div>
      </article>

      <article class="settings-panel settings-panel--spaced">
        <div class="settings-panel-inner settings-panel-inner--rows">
          <span class="cat-panel-accent" aria-hidden="true"></span>
          <div class="settings-row settings-row--switch">
            <span class="settings-row-leading" aria-hidden="true">${renderNavIcon('map', { strokeWidth: 2, width: 18, height: 18 })}</span>
            <div class="settings-row-text">
              <span class="settings-row-label">Localisation</span>
              <span class="settings-row-value" id="settings-location-sub">Afficher votre position sur la carte</span>
            </div>
            <label class="settings-switch">
              <input type="checkbox" id="settings-location-switch" class="settings-switch-input" aria-label="Activer la localisation" />
              <span class="settings-switch-track" aria-hidden="true">
                <span class="settings-switch-thumb"></span>
              </span>
            </label>
          </div>
        </div>
      </article>
    </section>

    <section class="settings-section" aria-labelledby="settings-app-heading">
      <div class="section-head">
        <div>
          <h2 id="settings-app-heading">Application</h2>
          <p>Informations et session</p>
        </div>
      </div>

      <article class="settings-panel">
        <div class="settings-panel-inner settings-panel-inner--rows">
          <span class="cat-panel-accent" aria-hidden="true"></span>
          <div class="settings-row settings-row--version">
            <span class="settings-row-label">Version</span>
            <span id="settings-version" aria-label="Version de l'application">—</span>
          </div>
          <div class="settings-row settings-row--action">
            <button type="button" class="settings-btn settings-btn--danger" id="settings-logout-btn">
              <span class="settings-btn-label">Se déconnecter</span>
            </button>
          </div>
        </div>
      </article>
    </section>
  </main>
`;
