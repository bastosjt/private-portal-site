import { NAV_ITEMS } from '../config.js';

const ICONS = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  activity: '<path d="M6 19V5"/><path d="M10 19V6.8"/><path d="M14 19v-7.8"/><path d="M18 5v4"/><path d="M18 19v-6"/><path d="M22 19V9"/><path d="M2 19V9a4 4 0 0 1 4-4c2 0 4 1.33 6 4s4 4 6 4a4 4 0 1 0-3-6.65"/>',
  restaurant: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  film: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>',
  travel: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  wishlist: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
};

const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

function icon(name, strokeWidth = name === 'activity' ? 2 : 1.75) {
  const paths = ICONS[name] || ICONS.home;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function getActiveId() {
  const page = window.location.pathname.split('/').pop() || 'accueil.html';
  const match = NAV_ITEMS.find((item) => item.href === page);
  return match?.id ?? 'accueil';
}

export function renderSidebar(container, { user, activeId = getActiveId() } = {}) {
  const navLinks = NAV_ITEMS.map((item) => {
    const isActive = item.id === activeId;
    return `
      <a href="${item.href}" class="sidebar-link${isActive ? ' is-active' : ''}"${item.theme ? ` data-theme="${item.theme}"` : ''}${isActive ? ' aria-current="page"' : ''}>
        <span class="sidebar-link-icon">${icon(item.icon)}</span>
        <span class="sidebar-link-label">${item.label}</span>
      </a>
    `;
  }).join('');

  container.innerHTML = `
    <aside class="sidebar" id="sidebar" aria-label="Navigation principale">
      <div class="sidebar-inner">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <div class="sidebar-brand-icon">${icon('wishlist')}</div>
            <div class="sidebar-brand-text">
              Notre espace
              <span>À nous deux</span>
            </div>
          </div>
          <button type="button" id="sidebar-close" class="sidebar-close" aria-label="Fermer le menu">
            ${CLOSE_ICON}
          </button>
        </div>

        <nav class="sidebar-nav">${navLinks}</nav>

        <div class="sidebar-footer">
          <div class="sidebar-user">
            <span class="sidebar-user-avatar" data-user-initials aria-hidden="true"></span>
            <div class="sidebar-user-info">
              <span class="sidebar-user-label">Connecté</span>
              <span class="sidebar-user-email" data-user-email></span>
            </div>
          </div>
          <button type="button" id="logout-btn" class="sidebar-logout">Déconnexion</button>
        </div>
      </div>
    </aside>

    <div class="sidebar-overlay" id="sidebar-overlay" hidden></div>
  `;

  if (user) {
    updateSidebarUser(container, user);
  }
}

export function updateSidebarUser(container, user) {
  const initials = getInitials(user.email);
  container.querySelectorAll('[data-user-initials]').forEach((el) => {
    el.textContent = initials;
  });
  container.querySelectorAll('[data-user-email]').forEach((el) => {
    el.textContent = user.email;
  });
}

function getInitials(email) {
  const name = email.split('@')[0] || '?';
  const parts = name.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function initSidebar({ onLogout } = {}) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggle = document.getElementById('menu-toggle');
  const closeBtn = document.getElementById('sidebar-close');

  const open = () => {
    sidebar?.classList.add('is-open');
    overlay?.removeAttribute('hidden');
    document.body.classList.add('sidebar-open');
  };

  const close = () => {
    sidebar?.classList.remove('is-open');
    overlay?.setAttribute('hidden', '');
    document.body.classList.remove('sidebar-open');
  };

  toggle?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', close);

  document.querySelectorAll('.sidebar-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 900px)').matches) close();
    });
  });

  document.getElementById('logout-btn')?.addEventListener('click', onLogout);

  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 901px)').matches) close();
  });
}

export { icon as sidebarIcon };
