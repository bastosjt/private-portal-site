import { SETTINGS_THEME } from '../../config.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';

const CHEVRON = renderNavIcon('chevron-right', { strokeWidth: 2, width: 18, height: 18 });

function renderMenuLink({ id, icon, label, valueId, disabled = false, soon = false }) {
  const tag = disabled ? 'div' : 'button';
  const typeAttr = disabled ? '' : ' type="button"';
  const disabledClass = disabled ? ' is-disabled' : '';
  const soonBadge = soon ? '<span class="settings-menu-soon">Bientôt</span>' : '';
  const valueHtml = valueId
    ? `<span class="settings-menu-value" id="${valueId}">—</span>`
    : soonBadge;

  return `
    <${tag}${typeAttr}
      class="settings-menu-link${disabledClass}"
      data-settings-panel="${id}"
      ${disabled ? 'aria-disabled="true"' : `aria-label="Ouvrir ${label}"`}
    >
      <span class="settings-menu-icon" aria-hidden="true">${renderNavIcon(icon, { strokeWidth: 2, width: 18, height: 18 })}</span>
      <span class="settings-menu-copy">
        <span class="settings-menu-label">${label}</span>
        ${valueHtml}
      </span>
      ${disabled ? '' : `<span class="settings-menu-chevron" aria-hidden="true">${CHEVRON}</span>`}
    </${tag}>
  `;
}

export const SETTINGS_VIEW_HTML = `
  <main class="page-content settings-page" data-theme="${SETTINGS_THEME}" data-settings-view="hub">
    <div class="settings-hub" id="settings-hub">
      <section class="settings-hero" aria-label="Profil">
        <span class="settings-hero-avatar" id="settings-avatar" aria-hidden="true"></span>
        <h2 class="settings-hero-name" id="settings-display-name"></h2>
        <p class="settings-hero-email" id="settings-email"></p>
      </section>

      <section class="settings-section settings-section--love" aria-labelledby="settings-space-heading">
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
      </section>

      <section class="settings-section" aria-labelledby="settings-menu-heading">
        <div class="section-head">
          <div>
            <h2 id="settings-menu-heading">Réglages</h2>
            <p>Profil, données et application</p>
          </div>
        </div>

        <nav class="settings-menu" aria-label="Sections des réglages">
          ${renderMenuLink({ id: 'profile', icon: 'user', label: 'Mon profil', valueId: 'settings-menu-profile-value' })}
          ${renderMenuLink({ id: 'couple', icon: 'heart', label: 'Notre couple', valueId: 'settings-menu-couple-value' })}
          ${renderMenuLink({ id: 'data', icon: 'database', label: 'Données', valueId: 'settings-menu-data-value' })}
          ${renderMenuLink({ id: 'theme', icon: 'palette', label: 'Thème', disabled: true, soon: true })}
          ${renderMenuLink({ id: 'app', icon: 'settings', label: 'Application', valueId: 'settings-menu-app-value' })}
        </nav>
      </section>
    </div>

    <div class="settings-detail" id="settings-detail" hidden>
      <section class="settings-panel-view settings-section--profile" data-panel="profile" hidden aria-labelledby="settings-profile-heading">
        <div class="section-head">
          <div>
            <h2 id="settings-profile-heading">Mon profil</h2>
            <p>Pseudo et photo de profil</p>
          </div>
        </div>

        <button type="button" class="settings-profile-side-card" id="settings-avatar-change">
          <span class="settings-profile-side-card-icon" id="settings-avatar-change-icon" aria-hidden="true"></span>
          <span class="settings-profile-side-card-text">
            <span class="settings-profile-side-card-label" id="settings-avatar-change-label">Choisir un animal</span>
            <span class="settings-profile-side-card-sub" id="settings-avatar-change-sub">Photo de profil</span>
          </span>
        </button>

        <button type="button" class="settings-profile-side-card" id="settings-display-name-change">
          <span class="settings-profile-side-card-icon" aria-hidden="true">${renderNavIcon('user-pen', { strokeWidth: 2, width: 20, height: 20 })}</span>
          <span class="settings-profile-side-card-text">
            <span class="settings-profile-side-card-label">Changer le pseudo</span>
            <span class="settings-profile-side-card-sub" id="settings-display-name-sub">Pseudo</span>
          </span>
        </button>
      </section>

      <section class="settings-panel-view" data-panel="couple" hidden aria-labelledby="settings-couple-heading">
        <div class="section-head">
          <div>
            <h2 id="settings-couple-heading">Notre couple</h2>
            <p>Surnom et nom de votre espace</p>
          </div>
        </div>

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

      <section class="settings-panel-view" data-panel="data" hidden aria-labelledby="settings-data-heading">
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

      <section class="settings-panel-view" data-panel="app" hidden aria-labelledby="settings-app-heading">
        <div class="section-head">
          <div>
            <h2 id="settings-app-heading">Application</h2>
            <p>Version et session</p>
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
    </div>
  </main>
`;
