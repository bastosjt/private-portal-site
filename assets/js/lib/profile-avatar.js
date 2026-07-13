import { applyAnimalAvatarStyles } from './profile-animal.js';
import { getProfileAnimalEntry } from './user-profile.js';
import { renderNavIcon } from './lucide-icon.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getInitialsFromEmail(email) {
  const name = email.split('@')[0] || '?';
  const parts = name.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function getInitialsFromName(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function renderAvatarContent(uid, { email = '', name = '' } = {}) {
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

export function paintAvatarElement(el, avatar) {
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
