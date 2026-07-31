import { escapeHtml } from '../../lib/escape-html.js';
import {
  APP_NAME,
  APP_VERSION,
  getSelectableAppThemes,
  BASE_THEME,
  renderVersionBadgeHtml,
  COUPLE_START_DATE,
  getUserDisplayName,
  SETTINGS_ITEM,
  SETTINGS_THEME,
} from '../../config.js';
import { resetMapWarmup } from '../carte/map-warmup.js';
import {
  getCacheAgeMs,
  getCollectionCountFromCache,
  isPrefetchComplete,
  ITEM_COLLECTIONS,
  refreshAppData,
  clearAppDataCache,
} from '../../data/appDataCache.js';
import { applyAnimalAvatarStyles, getProfileAnimalEntry, getProfileAnimalColorStyle, getProfileAnimalMeta } from '../../lib/profile-animal.js';
import { paintAvatarElement, renderAvatarContent } from '../../lib/profile-avatar.js';
import {
  getDisplayNameForUid,
  getKnownMemberUids,
  getPartnerBadgeLabel,
  getPartnerNickname,
  getPartnerUid,
} from '../../lib/user-profile.js';
import { getSpaceTagline, getSpaceTheme, setSpaceTheme } from '../../lib/space-settings.js';
import { applyAppTheme, getAppThemeMeta } from '../../lib/app-theme.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';
import {
  getUserLocationConsent,
  getUserLocationLngLat,
  onUserLocationChange,
  setUserLocationEnabled,
} from '../../lib/user-location.js';
import { initProfileAnimalPicker } from '../../ui/profile-animal-picker.js';
import { initProfileDisplayNamePicker } from '../../ui/profile-display-name-picker.js';
import { initProfilePartnerNicknamePicker } from '../../ui/profile-partner-nickname-picker.js';
import { initSpaceTaglinePicker } from '../../ui/space-tagline-picker.js';
import { updateSidebarTagline } from '../../ui/sidebar.js';
import {
  setPageHeader,
  setPageHeaderBackHandler,
  clearPageHeaderBackHandler,
  beginPageHeaderSwap,
  revealPageHeader,
} from '../../ui/page-header.js';
import { nextFrame, waitForTransition } from '../../lib/transitions.js';

const VIEW_TRANSITION_MS = 220; // aligné sur --duration-page-leave

let currentUser = null;
let pageAbort = null;
let onLogout = null;
let onDataSynced = null;
let onProfileUpdated = null;
let syncStatusTimer = null;
let profileAnimalPicker = null;
let profileDisplayNamePicker = null;
let profilePartnerNicknamePicker = null;
let spaceTaglinePicker = null;
let stopLocationListener = null;
let activePanel = null;
let hubScrollY = 0;
let viewTransitionToken = 0;
let isViewTransitioning = false;

const MEMBER_THEMES = ['slate', BASE_THEME];

const PANEL_HEADERS = {
  profile: { title: 'Mon profil', sub: 'Pseudo et photo de profil', icon: 'user' },
  couple: { title: 'Notre couple', sub: 'Surnom et nom de votre espace', icon: 'heart' },
  data: { title: 'Données', sub: 'Synchronisation Firestore', icon: 'database' },
  theme: { title: 'Thème', sub: 'Apparence de l\'application', icon: 'palette' },
  app: { title: 'Application', sub: 'Version et session', icon: 'settings' },
};

function getDaysTogether(startDateStr) {
  const start = new Date(startDateStr);
  const now = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function formatStartDate(startDateStr) {
  return new Date(startDateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatSyncAge(ageMs) {
  if (ageMs === Infinity || !isPrefetchComplete()) return 'Pas encore chargé';
  if (ageMs < 60_000) return 'À l\'instant';
  if (ageMs < 3_600_000) {
    const mins = Math.floor(ageMs / 60_000);
    return `Il y a ${mins} min`;
  }
  const hours = Math.floor(ageMs / 3_600_000);
  return `Il y a ${hours} h`;
}

function getTotalCachedItems() {
  return ITEM_COLLECTIONS.reduce((sum, collection) => sum + getCollectionCountFromCache(collection), 0);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderProfile(user) {
  const displayName = getUserDisplayName(user) || 'Utilisateur';
  const email = user.email || '';
  const avatar = renderAvatarContent(user.uid, { email });
  const entry = getProfileAnimalEntry(user.uid);
  const animalId = entry?.animal ?? null;

  paintAvatarElement(document.getElementById('settings-avatar'), avatar);

  setText('settings-display-name', displayName);
  setText('settings-email', email);
  setText('settings-display-name-sub', displayName);

  const changeCardEl = document.getElementById('settings-avatar-change');
  const changeIconEl = document.getElementById('settings-avatar-change-icon');
  const nameCardEl = document.getElementById('settings-display-name-change');

  if (entry) {
    const animal = getProfileAnimalMeta(entry.animal);
    const color = getProfileAnimalColorStyle(entry.color);
    setText('settings-avatar-change-label', 'Changer d\'animal');
    setText('settings-avatar-change-sub', `${animal?.label || 'Animal'} · ${color.label}`);
    setText('settings-menu-profile-value', `${animal?.label || 'Animal'} · ${displayName}`);
  } else {
    setText('settings-avatar-change-label', 'Choisir un animal');
    setText('settings-avatar-change-sub', 'Photo de profil');
    setText('settings-menu-profile-value', displayName);
  }

  if (changeCardEl) {
    changeCardEl.classList.toggle('has-animal', avatar.hasAnimal);
    changeCardEl.setAttribute(
      'aria-label',
      avatar.hasAnimal
        ? `Changer l'animal de profil (${getProfileAnimalMeta(animalId)?.label || 'animal actif'})`
        : 'Choisir un animal de profil',
    );
  }

  if (changeIconEl) {
    if (animalId) {
      changeIconEl.innerHTML = renderNavIcon(animalId, { strokeWidth: 2, width: 20, height: 20 });
      applyAnimalAvatarStyles(changeIconEl, user.uid);
    } else {
      changeIconEl.innerHTML = renderNavIcon('cat', { strokeWidth: 2, width: 20, height: 20 });
      changeIconEl.classList.remove('has-animal');
      changeIconEl.style.background = '';
      changeIconEl.style.border = '';
      changeIconEl.style.color = '';
      changeIconEl.style.boxShadow = '';
    }
  }

  if (nameCardEl) {
    nameCardEl.setAttribute('aria-label', `Changer le pseudo (${displayName})`);
  }
}

function renderSpace(user) {
  const days = getDaysTogether(COUPLE_START_DATE);
  const partnerNickname = user ? getPartnerNickname(user.uid) : '';
  const partnerName = user ? getDisplayNameForUid(getPartnerUid(user.uid)) : '';
  const spaceTagline = getSpaceTagline();

  setText('settings-days-count', String(days));
  setText('settings-days-label', days <= 1 ? 'jour ensemble' : 'jours ensemble');
  setText('settings-since-date', `Depuis le ${formatStartDate(COUPLE_START_DATE)}`);
  setText('settings-app-name', APP_NAME);
  setText('settings-app-tagline', spaceTagline);
  setText('settings-space-tagline-sub', spaceTagline);

  const nicknameSubEl = document.getElementById('settings-partner-nickname-sub');
  const nicknameCardEl = document.getElementById('settings-partner-nickname-change');
  const spaceTaglineCardEl = document.getElementById('settings-space-tagline-change');

  if (nicknameSubEl) {
    nicknameSubEl.textContent = partnerNickname
      ? `Pour ${partnerName} · ${partnerNickname}`
      : 'Pas encore de surnom';
  }
  if (nicknameCardEl) {
    nicknameCardEl.setAttribute(
      'aria-label',
      partnerNickname
        ? `Changer le surnom de ${partnerName} (${partnerNickname})`
        : `Choisir un surnom pour ${partnerName || 'votre copain adoré'}`,
    );
  }
  if (spaceTaglineCardEl) {
    spaceTaglineCardEl.setAttribute('aria-label', `Modifier le nom de notre espace (${spaceTagline})`);
  }

  setText('settings-menu-couple-value', partnerNickname || spaceTagline || '—');
}

function renderMembers(user) {
  const container = document.getElementById('settings-members');
  if (!container) return;

  const partnerBadgeLabel = getPartnerBadgeLabel(user?.uid);

  const members = getKnownMemberUids().map((uid, index) => ({
    uid,
    name: getDisplayNameForUid(uid),
    theme: MEMBER_THEMES[index % MEMBER_THEMES.length],
    isYou: user?.uid === uid,
    avatar: renderAvatarContent(uid, { name: getDisplayNameForUid(uid) }),
  }));

  container.innerHTML = members.map((member) => `
    <div class="settings-member${member.isYou ? ' is-you' : ' is-partner'}">
      <span class="settings-member-avatar settings-member-avatar--${member.theme}${member.avatar.hasAnimal ? ' has-animal' : ''}" data-member-uid="${escapeHtml(member.uid)}" aria-hidden="true">${member.avatar.html}</span>
      <div class="settings-member-info">
        <span class="settings-member-name">${escapeHtml(member.name)}</span>
        ${member.isYou
    ? '<span class="settings-member-badge">Vous</span>'
    : `<span class="settings-member-badge">${escapeHtml(partnerBadgeLabel)}</span>`}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-member-uid]').forEach((el) => {
    const uid = el.dataset.memberUid;
    if (getProfileAnimalEntry(uid)) {
      applyAnimalAvatarStyles(el, uid);
    }
  });
}

function renderDataStatus() {
  const syncText = formatSyncAge(getCacheAgeMs());
  const total = getTotalCachedItems();
  const countText = isPrefetchComplete() ? `${total} éléments` : '-';

  setText('settings-sync-status', syncText);
  setText('settings-cache-count', countText);
  setText('settings-menu-data-value', syncText);
}

function renderAppInfo() {
  const versionEl = document.getElementById('settings-version');
  if (versionEl) {
    versionEl.innerHTML = renderVersionBadgeHtml(APP_VERSION);
    versionEl.setAttribute('aria-label', `Version ${APP_VERSION}`);
  }
  setText('settings-menu-app-value', `Version et session`);
}

function renderLocationStatus() {
  const subEl = document.getElementById('settings-location-sub');
  const switchEl = document.getElementById('settings-location-switch');
  if (!subEl) return;

  const isEnabled = getUserLocationConsent() === 'granted';
  const hasPosition = Boolean(getUserLocationLngLat());

  if (switchEl) {
    switchEl.checked = isEnabled;
    switchEl.disabled = false;
  }

  if (!isEnabled) {
    subEl.textContent = 'Afficher votre position sur la carte';
    return;
  }

  subEl.textContent = hasPosition
    ? 'Activée · utilisée sur la carte'
    : 'Activée · position en cours de récupération';
}

async function handleLocationSwitchChange(event) {
  const input = event.currentTarget;
  const enabled = input.checked;

  input.disabled = true;
  await setUserLocationEnabled(enabled);
  renderLocationStatus();
  input.disabled = false;
}

function renderTheme() {
  const current = getSpaceTheme();
  const meta = getAppThemeMeta(current);
  setText('settings-menu-theme-value', meta.label);

  const grid = document.getElementById('settings-theme-grid');
  if (!grid) return;

  grid.innerHTML = getSelectableAppThemes().map((theme, index) => {
    const isSelected = theme.id === current;
    return `
      <button
        type="button"
        class="settings-theme-card${isSelected ? ' is-selected' : ''}"
        data-theme-id="${theme.id}"
        role="radio"
        aria-checked="${isSelected ? 'true' : 'false'}"
        aria-label="${theme.label} — ${theme.description}"
        style="--theme-card-delay: ${index * 40}ms"
      >
        <span class="settings-theme-preview settings-theme-preview--${theme.id}" aria-hidden="true"></span>
        <span class="settings-theme-copy">
          <span class="settings-theme-name">${theme.label}</span>
          <span class="settings-theme-desc">${theme.description}</span>
        </span>
        <span class="settings-theme-check" aria-hidden="true">${renderNavIcon('check', { strokeWidth: 2.5, width: 18, height: 18 })}</span>
      </button>
    `;
  }).join('');
}

async function handleThemeSelect(themeId) {
  if (!themeId || themeId === getSpaceTheme()) return;

  const card = document.querySelector(`.settings-theme-card[data-theme-id="${themeId}"]`);
  card?.classList.add('is-saving');
  card?.setAttribute('aria-busy', 'true');

  const ok = await setSpaceTheme(themeId);
  if (ok) {
    applyAppTheme(themeId);
    renderTheme();
  } else {
    card?.classList.remove('is-saving');
    card?.removeAttribute('aria-busy');
  }
}

function renderAll(user) {
  renderProfile(user);
  renderSpace(user);
  renderMembers(user);
  renderDataStatus();
  renderLocationStatus();
  renderAppInfo();
  renderTheme();
}

function startSyncStatusTimer() {
  stopSyncStatusTimer();
  syncStatusTimer = window.setInterval(renderDataStatus, 30_000);
}

function stopSyncStatusTimer() {
  if (syncStatusTimer) {
    window.clearInterval(syncStatusTimer);
    syncStatusTimer = null;
  }
}

async function handleSyncClick(button) {
  if (!button || button.disabled) return;

  button.disabled = true;
  const label = button.querySelector('.settings-btn-label');
  const previousLabel = label?.textContent || '';
  if (label) label.textContent = 'Synchronisation…';

  try {
    await refreshAppData();
    renderDataStatus();
    onDataSynced?.();
  } catch {
    if (label) label.textContent = 'Échec — réessayer';
    window.setTimeout(() => {
      if (label) label.textContent = previousLabel;
    }, 2000);
    return;
  } finally {
    button.disabled = false;
    if (label) label.textContent = previousLabel;
  }
}

async function handleClearCacheClick(button) {
  if (!button || button.disabled) return;

  button.disabled = true;
  const label = button.querySelector('.settings-btn-label');
  const previousLabel = label?.textContent || '';
  if (label) label.textContent = 'Rechargement…';

  try {
    clearAppDataCache();
    resetMapWarmup();
    await refreshAppData();
    renderDataStatus();
    onDataSynced?.();
  } catch {
    if (label) label.textContent = 'Échec — réessayer';
    window.setTimeout(() => {
      if (label) label.textContent = previousLabel;
    }, 2000);
    return;
  } finally {
    button.disabled = false;
    if (label) label.textContent = previousLabel;
  }
}

function getPageRoot() {
  return document.querySelector('.settings-page');
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function applyHubView() {
  const page = getPageRoot();
  const hub = document.getElementById('settings-hub');
  const detail = document.getElementById('settings-detail');
  if (!page || !hub || !detail) return false;

  activePanel = null;
  page.dataset.settingsView = 'hub';
  hub.hidden = false;
  detail.hidden = true;
  detail.querySelectorAll('.settings-panel-view').forEach((panel) => {
    panel.hidden = true;
  });
  clearPageHeaderBackHandler();
  return true;
}

function applyPanelView(panelId) {
  const page = getPageRoot();
  const hub = document.getElementById('settings-hub');
  const detail = document.getElementById('settings-detail');
  const panel = detail?.querySelector(`.settings-panel-view[data-panel="${panelId}"]`);
  if (!page || !hub || !detail || !panel) return false;

  activePanel = panelId;
  page.dataset.settingsView = 'detail';
  hub.hidden = true;
  detail.hidden = false;
  detail.querySelectorAll('.settings-panel-view').forEach((el) => {
    el.hidden = el !== panel;
  });
  setPageHeaderBackHandler(() => {
    void showHub({ animate: true });
  });
  return true;
}

async function transitionSettingsView(applyFn, headerPatch, { animate = true, scrollTop = 0 } = {}) {
  const page = getPageRoot();
  if (!page) return;

  const token = ++viewTransitionToken;
  const canAnimate = animate && !prefersReducedMotion();
  const previousPanel = activePanel;

  isViewTransitioning = true;

  let headerSwapToken = null;
  if (canAnimate) {
    page.classList.remove('is-view-entering');
    page.classList.add('is-view-leaving');
    headerSwapToken = beginPageHeaderSwap();
    await waitForTransition(page, VIEW_TRANSITION_MS);
    if (token !== viewTransitionToken) {
      isViewTransitioning = false;
      return;
    }
  } else {
    page.classList.remove('is-view-leaving', 'is-view-entering');
  }

  if (!applyFn()) {
    page.classList.remove('is-view-leaving', 'is-view-entering');
    if (headerSwapToken != null) revealPageHeader(headerSwapToken);
    isViewTransitioning = false;
    return;
  }

  await setPageHeader(headerPatch, { animate: false });
  if (token !== viewTransitionToken) {
    isViewTransitioning = false;
    return;
  }

  // Ne reset le scroll que lors d’un vrai changement hub ↔ détail
  if (previousPanel !== activePanel) {
    window.scrollTo({ top: scrollTop, behavior: 'auto' });
  }

  if (canAnimate) {
    page.classList.remove('is-view-leaving');
    page.classList.add('is-view-entering');
    await nextFrame();
    if (token !== viewTransitionToken) {
      isViewTransitioning = false;
      return;
    }
    page.classList.remove('is-view-entering');
    revealPageHeader(headerSwapToken);
  }

  isViewTransitioning = false;
}

async function showHub({ animate = true } = {}) {
  if (isViewTransitioning && animate) return;

  await transitionSettingsView(
    () => applyHubView(),
    {
      title: SETTINGS_ITEM.label,
      sub: 'Votre compte · Our Space',
      icon: SETTINGS_ITEM.icon,
      theme: SETTINGS_THEME,
      showBack: false,
    },
    { animate, scrollTop: hubScrollY },
  );
}

async function showPanel(panelId, { animate = true } = {}) {
  const meta = PANEL_HEADERS[panelId];
  if (!meta) return;
  if (isViewTransitioning && animate) return;

  if (activePanel === null) {
    hubScrollY = window.scrollY || window.pageYOffset || 0;
  }

  await transitionSettingsView(
    () => applyPanelView(panelId),
    {
      ...meta,
      theme: SETTINGS_THEME,
      showBack: true,
    },
    { animate, scrollTop: 0 },
  );
}

export function initSettingsPage(user, { onLogout: logoutHandler, onDataSynced: dataSyncedHandler, onProfileUpdated: profileUpdatedHandler } = {}) {
  destroySettingsPage();
  currentUser = user;
  onLogout = logoutHandler ?? null;
  onDataSynced = dataSyncedHandler ?? null;
  onProfileUpdated = profileUpdatedHandler ?? null;
  pageAbort = new AbortController();
  const { signal } = pageAbort;

  if (user) renderAll(user);
  void showHub({ animate: false });
  startSyncStatusTimer();

  stopLocationListener = onUserLocationChange(() => renderLocationStatus());

  profileDisplayNamePicker = initProfileDisplayNamePicker({
    user,
    onChange: () => {
      if (currentUser) {
        renderAll(currentUser);
        onProfileUpdated?.();
      }
    },
    signal,
  });

  profilePartnerNicknamePicker = initProfilePartnerNicknamePicker({
    user,
    onChange: () => {
      if (currentUser) {
        renderAll(currentUser);
        onProfileUpdated?.();
      }
    },
    signal,
  });

  spaceTaglinePicker = initSpaceTaglinePicker({
    onChange: () => {
      if (currentUser) {
        renderAll(currentUser);
        updateSidebarTagline();
        onProfileUpdated?.();
      }
    },
    signal,
  });

  profileAnimalPicker = initProfileAnimalPicker({
    user,
    onChange: () => {
      if (currentUser) {
        renderAll(currentUser);
        onProfileUpdated?.();
      }
    },
    signal,
  });

  const openDisplayNamePicker = () => profileDisplayNamePicker?.open();
  const openPartnerNicknamePicker = () => profilePartnerNicknamePicker?.open();
  const openSpaceTaglinePicker = () => spaceTaglinePicker?.open();
  const openAnimalPicker = () => profileAnimalPicker?.open();

  document.getElementById('settings-hub')?.addEventListener('click', (event) => {
    const link = event.target.closest('.settings-menu-link[data-settings-panel]');
    if (!link || link.classList.contains('is-disabled')) return;
    const panelId = link.dataset.settingsPanel;
    if (panelId) void showPanel(panelId);
  }, { signal });

  document.getElementById('settings-detail-back')?.addEventListener('click', () => {
    void showHub({ animate: true });
  }, { signal });

  document.getElementById('settings-space-tagline-change')?.addEventListener('click', openSpaceTaglinePicker, { signal });
  document.getElementById('settings-partner-nickname-change')?.addEventListener('click', openPartnerNicknamePicker, { signal });
  document.getElementById('settings-display-name-change')?.addEventListener('click', openDisplayNamePicker, { signal });
  document.getElementById('settings-avatar-change')?.addEventListener('click', openAnimalPicker, { signal });

  document.getElementById('settings-clear-cache-btn')?.addEventListener('click', (event) => {
    handleClearCacheClick(event.currentTarget);
  }, { signal });

  document.getElementById('settings-sync-btn')?.addEventListener('click', (event) => {
    handleSyncClick(event.currentTarget);
  }, { signal });

  document.getElementById('settings-location-switch')?.addEventListener('change', handleLocationSwitchChange, { signal });

  document.getElementById('settings-theme-grid')?.addEventListener('click', (event) => {
    const card = event.target.closest('.settings-theme-card[data-theme-id]');
    if (!card || card.classList.contains('is-selected') || card.classList.contains('is-saving')) return;
    void handleThemeSelect(card.dataset.themeId);
  }, { signal });

  document.getElementById('settings-logout-btn')?.addEventListener('click', () => {
    onLogout?.();
  }, { signal });
}

export function destroySettingsPage() {
  viewTransitionToken += 1;
  isViewTransitioning = false;
  pageAbort?.abort();
  pageAbort = null;
  profileAnimalPicker?.destroy();
  profileAnimalPicker = null;
  profileDisplayNamePicker?.destroy();
  profileDisplayNamePicker = null;
  profilePartnerNicknamePicker?.destroy();
  profilePartnerNicknamePicker = null;
  spaceTaglinePicker?.destroy();
  spaceTaglinePicker = null;
  stopLocationListener?.();
  stopLocationListener = null;
  stopSyncStatusTimer();
  clearPageHeaderBackHandler();
  activePanel = null;
  hubScrollY = 0;
  currentUser = null;
  onLogout = null;
  onDataSynced = null;
  onProfileUpdated = null;
}

export function refreshSettingsPage() {
  if (currentUser) renderAll(currentUser);
  if (activePanel) {
    void showPanel(activePanel, { animate: false });
  } else {
    void showHub({ animate: false });
  }
}
