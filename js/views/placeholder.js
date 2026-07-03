import { sidebarIcon } from '../components/sidebar.js';
import { NAV_ITEMS } from '../config.js';

export function getPlaceholderViewHtml(routeId) {
  const navItem = NAV_ITEMS.find((item) => item.id === routeId) || NAV_ITEMS[0];
  const theme = navItem.theme || 'cyan';

  return `
    <header class="page-header">
      <button type="button" class="btn-menu" id="menu-toggle" aria-label="Ouvrir le menu">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="4" x2="20" y1="12" y2="12"/>
          <line x1="4" x2="20" y1="6" y2="6"/>
          <line x1="4" x2="20" y1="18" y2="18"/>
        </svg>
      </button>
      <div class="page-header-mobile-icon" data-theme="${theme}" aria-hidden="true">
        ${sidebarIcon(navItem.icon)}
      </div>
      <div class="page-header-content">
        <h1 class="page-header-title">${navItem.label}</h1>
        <p class="page-header-sub">Bientôt disponible</p>
      </div>
    </header>

    <main class="page-content">
      <section class="cat-panel" data-theme="${theme}">
        <div class="cat-panel-inner">
          <span class="cat-panel-accent" aria-hidden="true"></span>
          <div class="cat-panel-head">
            <div class="cat-panel-title">
              <span class="cat-panel-icon">${sidebarIcon(navItem.icon)}</span>
              <div>
                <h3>${navItem.label}</h3>
                <p>Cette section arrive très bientôt</p>
              </div>
            </div>
          </div>
          <p style="color: var(--text-muted); margin: 0;">En attendant, explorez vos activités depuis le menu.</p>
        </div>
      </section>
    </main>
  `;
}
