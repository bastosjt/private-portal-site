import {
  APP_NAME,
  APP_VERSION,
  renderVersionBadgeHtml,
  COUPLE_START_DATE,
  getUserDisplayName,
} from '../../config.js';
import {
  getCacheAgeMs,
  getCollectionCountFromCache,
  isPrefetchComplete,
  ITEM_COLLECTIONS,
  refreshAppData,
  clearAppDataCache,
} from '../../data/appDataCache.js';
import { getProfileAnimalEntry, getProfileAnimalColorStyle, getProfileAnimalMeta, applyAnimalAvatarStyles } from '../../lib/profile-animal.js';
import {
  getDisplayNameForUid,
  getKnownMemberUids,
  getPartnerBadgeLabel,
  getPartnerNickname,
  getPartnerUid,
} from '../../lib/user-profile.js';
import { getSpaceTagline } from '../../lib/space-settings.js';
import { renderNavIcon } from '../../lib/lucide-icon.js';
import { initProfileAnimalPicker } from '../../ui/profile-animal-picker.js';
import { initProfileDisplayNamePicker } from '../../ui/profile-display-name-picker.js';
import { initProfilePartnerNicknamePicker } from '../../ui/profile-partner-nickname-picker.js';
import { initSpaceTaglinePicker } from '../../ui/space-tagline-picker.js';
import { updateSidebarTagline } from '../../ui/sidebar.js';

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

const MEMBER_THEMES = ['slate', 'love'];

function getInitialsFromEmail(email) {
  const name = email.split('@')[0] || '?';
  const parts = name.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getInitialsFromName(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

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

function renderAvatarContent(uid, { email = '', name = '' } = {}) {
  const entry = getProfileAnimalEntry(uid);
  if (entry) {
    return {
      html: renderNavIcon(entry.animal, { strokeWidth: 2, width: 22, height: 22 }),
      hasAnimal: true,
      uid,
    };
  }

  const initials = name ? getInitialsFromName(name) : getInitialsFromEmail(email);
  return { html: escapeHtml(initials), hasAnimal: false, uid: null };
}

function paintAvatarElement(el, avatar) {
  if (!el) return;
  el.innerHTML = avatar.html;
  if (avatar.hasAnimal && avatar.uid) {
    applyAnimalAvatarStyles(el, avatar.uid);
  } else {
    el.classList.remove('has-animal');
    el.style.background = '';
    el.style.border = '';
    el.style.color = '';
    el.style.boxShadow = '';
  }
  el.classList.toggle('has-animal', avatar.hasAnimal);
}

function renderProfile(user) {
  const displayName = getUserDisplayName(user) || 'Utilisateur';
  const avatarEl = document.getElementById('settings-avatar');
  const changeLabelEl = document.getElementById('settings-avatar-change-label');
  const changeSubEl = document.getElementById('settings-avatar-change-sub');
  const changeCardEl = document.getElementById('settings-avatar-change');
  const changeIconEl = document.getElementById('settings-avatar-change-icon');
  const nameCardSubEl = document.getElementById('settings-display-name-sub');
  const nameCardEl = document.getElementById('settings-display-name-change');
  const nameEl = document.getElementById('settings-display-name');
  const emailEl = document.getElementById('settings-email');
  const avatar = renderAvatarContent(user.uid, { email: user.email || '' });
  const entry = getProfileAnimalEntry(user.uid);
  const animalId = entry?.animal ?? null;

  paintAvatarElement(avatarEl, avatar);
  if (changeLabelEl) {
    changeLabelEl.textContent = avatar.hasAnimal ? 'Changer d\'animal' : 'Choisir un animal';
  }
  if (changeSubEl) {
    if (entry) {
      const animal = getProfileAnimalMeta(entry.animal);
      const color = getProfileAnimalColorStyle(entry.color);
      changeSubEl.textContent = `${animal?.label || 'Animal'} · ${color.label}`;
    } else {
      changeSubEl.textContent = 'Photo de profil';
    }
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
  if (nameEl) nameEl.textContent = displayName;
  if (nameCardSubEl) nameCardSubEl.textContent = displayName;
  if (nameCardEl) {
    nameCardEl.setAttribute('aria-label', `Changer le pseudo (${displayName})`);
  }
  if (emailEl) emailEl.textContent = user.email || '';
}

function renderSpace(user) {
  const days = getDaysTogether(COUPLE_START_DATE);
  const daysEl = document.getElementById('settings-days-count');
  const labelEl = document.getElementById('settings-days-label');
  const sinceEl = document.getElementById('settings-since-date');
  const appNameEl = document.getElementById('settings-app-name');
  const taglineEl = document.getElementById('settings-app-tagline');
  const nicknameSubEl = document.getElementById('settings-partner-nickname-sub');
  const nicknameCardEl = document.getElementById('settings-partner-nickname-change');
  const spaceTaglineSubEl = document.getElementById('settings-space-tagline-sub');
  const spaceTaglineCardEl = document.getElementById('settings-space-tagline-change');
  const partnerNickname = user ? getPartnerNickname(user.uid) : '';
  const partnerName = user ? getDisplayNameForUid(getPartnerUid(user.uid)) : '';
  const spaceTagline = getSpaceTagline();

  if (daysEl) daysEl.textContent = String(days);
  if (labelEl) labelEl.textContent = days <= 1 ? 'jour ensemble' : 'jours ensemble';
  if (sinceEl) sinceEl.textContent = `Depuis le ${formatStartDate(COUPLE_START_DATE)}`;
  if (appNameEl) appNameEl.textContent = APP_NAME;
  if (taglineEl) taglineEl.textContent = spaceTagline;
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
  if (spaceTaglineSubEl) spaceTaglineSubEl.textContent = spaceTagline;
  if (spaceTaglineCardEl) {
    spaceTaglineCardEl.setAttribute('aria-label', `Modifier le nom de notre espace (${spaceTagline})`);
  }
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
  const syncEl = document.getElementById('settings-sync-status');
  const countEl = document.getElementById('settings-cache-count');

  if (syncEl) syncEl.textContent = formatSyncAge(getCacheAgeMs());
  if (countEl) {
    const total = getTotalCachedItems();
    countEl.textContent = isPrefetchComplete() ? `${total} éléments` : '-';
  }
}

function renderAppInfo() {
  const versionEl = document.getElementById('settings-version');
  if (versionEl) {
    versionEl.innerHTML = renderVersionBadgeHtml(APP_VERSION);
    versionEl.setAttribute('aria-label', `Version ${APP_VERSION}`);
  }
}

function renderAll(user) {
  renderProfile(user);
  renderSpace(user);
  renderMembers(user);
  renderDataStatus();
  renderAppInfo();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

export function initSettingsPage(user, { onLogout: logoutHandler, onDataSynced: dataSyncedHandler, onProfileUpdated: profileUpdatedHandler } = {}) {
  destroySettingsPage();
  currentUser = user;
  onLogout = logoutHandler ?? null;
  onDataSynced = dataSyncedHandler ?? null;
  onProfileUpdated = profileUpdatedHandler ?? null;
  pageAbort = new AbortController();
  const { signal } = pageAbort;

  if (user) renderAll(user);
  startSyncStatusTimer();

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

  document.getElementById('settings-space-tagline-change')?.addEventListener('click', openSpaceTaglinePicker, { signal });
  document.getElementById('settings-partner-nickname-change')?.addEventListener('click', openPartnerNicknamePicker, { signal });
  document.getElementById('settings-display-name-change')?.addEventListener('click', openDisplayNamePicker, { signal });
  document.getElementById('settings-avatar-btn')?.addEventListener('click', openAnimalPicker, { signal });
  document.getElementById('settings-avatar-change')?.addEventListener('click', openAnimalPicker, { signal });

  document.getElementById('settings-clear-cache-btn')?.addEventListener('click', (event) => {
    handleClearCacheClick(event.currentTarget);
  }, { signal });

  document.getElementById('settings-sync-btn')?.addEventListener('click', (event) => {
    handleSyncClick(event.currentTarget);
  }, { signal });

  document.getElementById('settings-logout-btn')?.addEventListener('click', () => {
    onLogout?.();
  }, { signal });
}

export function destroySettingsPage() {
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
  stopSyncStatusTimer();
  currentUser = null;
  onLogout = null;
  onDataSynced = null;
  onProfileUpdated = null;
}

export function refreshSettingsPage() {
  if (currentUser) renderAll(currentUser);
}
