import { fetchAllUserProfiles, upsertUserProfile } from '../firebase/userProfiles.js';
import {
  DEFAULT_PROFILE_COLOR,
  PROFILE_ANIMAL_COLORS,
  PROFILE_ANIMALS,
  VALID_ANIMAL_IDS,
  VALID_COLOR_IDS,
} from './profile-animal-data.js';

/** Prénoms par défaut — clé = uid Firebase */
export const USER_DISPLAY_NAMES = {
  fiiTfAA6tWRWSiIi9mhni91XU2y1: 'Bastien',
  by7lDskaTvPBOqEg3OOBXw0GWWw1: 'Louis',
};

const LEGACY_ANIMAL_STORAGE_KEY = 'our-space-profile-animals';
const DEFAULT_COLOR = DEFAULT_PROFILE_COLOR;
export const DEFAULT_PARTNER_NICKNAME_LABEL = 'Votre copain adoré';

const profilesByUid = new Map();
let initPromise = null;

function readLegacyAnimalStore() {
  try {
    const raw = localStorage.getItem(LEGACY_ANIMAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLegacyAnimalStore(store) {
  localStorage.setItem(LEGACY_ANIMAL_STORAGE_KEY, JSON.stringify(store));
}

function normalizeAnimalEntry(raw) {
  if (!raw) return null;

  if (typeof raw === 'string') {
    if (!VALID_ANIMAL_IDS.has(raw)) return null;
    return { animal: raw, color: DEFAULT_COLOR };
  }

  if (typeof raw === 'object' && VALID_ANIMAL_IDS.has(raw.animal)) {
    return {
      animal: raw.animal,
      color: VALID_COLOR_IDS.has(raw.color) ? raw.color : DEFAULT_COLOR,
    };
  }

  return null;
}

function normalizeProfile(uid, raw = {}) {
  const profileAnimal = normalizeAnimalEntry(raw.profileAnimal);
  const listPreferences = raw.listPreferences && typeof raw.listPreferences === 'object'
    ? { ...raw.listPreferences }
    : {};

  return {
    displayName: typeof raw.displayName === 'string' ? raw.displayName.trim() : '',
    partnerNickname: typeof raw.partnerNickname === 'string' ? raw.partnerNickname.trim() : '',
    profileAnimal,
    listPreferences,
  };
}

function setCachedProfile(uid, profile) {
  profilesByUid.set(uid, normalizeProfile(uid, profile));
}

function getCachedProfile(uid) {
  return profilesByUid.get(uid) ?? null;
}

function syncLegacyAnimalCache(uid, entry) {
  const store = readLegacyAnimalStore();
  if (entry) store[uid] = entry;
  else delete store[uid];
  writeLegacyAnimalStore(store);
}

function getEmailFallbackName(email = '') {
  const local = email.split('@')[0] || '';
  const part = local.split(/[._-]/)[0] || local;
  if (!part) return '';
  return part.charAt(0).toUpperCase() + part.slice(1);
}

export function getKnownMemberUids() {
  return Object.keys(USER_DISPLAY_NAMES);
}

export function getPartnerUid(currentUid) {
  if (!currentUid) return null;
  return getKnownMemberUids().find((uid) => uid !== currentUid) ?? null;
}

export function getPartnerNickname(uid) {
  if (!uid) return '';
  return getCachedProfile(uid)?.partnerNickname || '';
}

export function getPartnerBadgeLabel(viewerUid) {
  return getPartnerNickname(viewerUid) || DEFAULT_PARTNER_NICKNAME_LABEL;
}

export function getItemAuthorDisplayLabel(authorUid, viewerUid) {
  if (!authorUid) return '';
  if (viewerUid && authorUid === viewerUid) return 'Vous';
  if (viewerUid && authorUid === getPartnerUid(viewerUid)) {
    return getPartnerBadgeLabel(viewerUid);
  }
  return getDisplayNameForUid(authorUid) || 'Inconnu';
}

export function getItemAuthorHeadline(authorUid) {
  if (!authorUid) return '';
  const name = getDisplayNameForUid(authorUid) || 'Inconnu';
  const parts = name.split(/\s+/).filter(Boolean);
  return parts[0] || name;
}

export function getItemAuthorAriaLabel(authorUid, viewerUid) {
  const headline = getItemAuthorHeadline(authorUid);
  const relational = getItemAuthorDisplayLabel(authorUid, viewerUid);
  if (!headline && !relational) return '';
  if (relational === 'Vous') return `Ajouté par ${headline}, vous`;
  if (relational && relational !== headline) return `Ajouté par ${headline}, ${relational}`;
  return `Ajouté par ${headline}`;
}

export function getDisplayNameForUid(uid, { email = '' } = {}) {
  if (!uid) return '';
  const profile = getCachedProfile(uid);
  if (profile?.displayName) return profile.displayName;
  if (USER_DISPLAY_NAMES[uid]) return USER_DISPLAY_NAMES[uid];
  return getEmailFallbackName(email);
}

export function getUserDisplayName(user) {
  if (!user) return '';
  return getDisplayNameForUid(user.uid, { email: user.email || '' }) || 'Utilisateur';
}

export function getProfileAnimalEntry(uid) {
  if (!uid) return null;
  const profile = getCachedProfile(uid);
  if (profile?.profileAnimal) return profile.profileAnimal;

  return normalizeAnimalEntry(readLegacyAnimalStore()[uid]);
}

export function getProfileAnimal(uid) {
  return getProfileAnimalEntry(uid)?.animal ?? null;
}

export function getProfileAnimalColor(uid) {
  return getProfileAnimalEntry(uid)?.color ?? DEFAULT_COLOR;
}

export function setProfileAnimal(uid, animalId, colorId = DEFAULT_COLOR) {
  if (!uid || !VALID_ANIMAL_IDS.has(animalId)) return;

  const entry = {
    animal: animalId,
    color: VALID_COLOR_IDS.has(colorId) ? colorId : DEFAULT_COLOR,
  };

  const profile = getCachedProfile(uid) ?? normalizeProfile(uid, {});
  setCachedProfile(uid, { ...profile, profileAnimal: entry });
  syncLegacyAnimalCache(uid, entry);

  upsertUserProfile(uid, { profileAnimal: entry }).catch((err) => {
    console.warn('setProfileAnimal:', err.message);
  });
}

export function clearProfileAnimal(uid) {
  if (!uid) return;

  const profile = getCachedProfile(uid) ?? normalizeProfile(uid, {});
  setCachedProfile(uid, { ...profile, profileAnimal: null });
  syncLegacyAnimalCache(uid, null);

  upsertUserProfile(uid, { profileAnimal: null }).catch((err) => {
    console.warn('clearProfileAnimal:', err.message);
  });
}

export function getListPreferences(uid, categoryId) {
  if (!uid || !categoryId) return null;
  const prefs = getCachedProfile(uid)?.listPreferences?.[categoryId];
  return prefs && typeof prefs === 'object' ? { ...prefs } : null;
}

export function saveListPreferences(uid, categoryId, settings) {
  if (!uid || !categoryId || !settings) return;

  const profile = getCachedProfile(uid) ?? normalizeProfile(uid, {});
  const listPreferences = {
    ...profile.listPreferences,
    [categoryId]: { ...settings },
  };

  setCachedProfile(uid, { ...profile, listPreferences });

  upsertUserProfile(uid, { listPreferences }).catch((err) => {
    console.warn('saveListPreferences:', err.message);
  });
}

export async function setUserDisplayName(uid, displayName) {
  if (!uid) return false;

  const trimmed = String(displayName || '').trim().slice(0, 32);
  if (!trimmed) return false;

  const profile = getCachedProfile(uid) ?? normalizeProfile(uid, {});
  setCachedProfile(uid, { ...profile, displayName: trimmed });

  try {
    await upsertUserProfile(uid, { displayName: trimmed });
    return true;
  } catch (err) {
    console.warn('setUserDisplayName:', err.message);
    return false;
  }
}

export async function setPartnerNickname(uid, nickname) {
  if (!uid) return false;

  const trimmed = String(nickname || '').trim().slice(0, 32);
  const profile = getCachedProfile(uid) ?? normalizeProfile(uid, {});
  setCachedProfile(uid, { ...profile, partnerNickname: trimmed });

  try {
    await upsertUserProfile(uid, { partnerNickname: trimmed || '' });
    return true;
  } catch (err) {
    console.warn('setPartnerNickname:', err.message);
    return false;
  }
}

async function migrateLegacyAnimals(remoteProfiles) {
  const legacy = readLegacyAnimalStore();
  const migrations = [];

  for (const [uid, raw] of Object.entries(legacy)) {
    const entry = normalizeAnimalEntry(raw);
    if (!entry) continue;

    const remoteAnimal = normalizeAnimalEntry(remoteProfiles[uid]?.profileAnimal);
    if (remoteAnimal) continue;

    migrations.push(
      upsertUserProfile(uid, { profileAnimal: entry }).catch((err) => {
        console.warn(`migrateLegacyAnimal(${uid}):`, err.message);
      }),
    );
  }

  await Promise.all(migrations);
}

export async function initUserProfiles(currentUid) {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const remoteProfiles = await fetchAllUserProfiles();
    await migrateLegacyAnimals(remoteProfiles);

    const merged = { ...remoteProfiles };
    const legacy = readLegacyAnimalStore();

    for (const uid of new Set([...Object.keys(remoteProfiles), ...Object.keys(legacy), currentUid].filter(Boolean))) {
      const remote = remoteProfiles[uid] || {};
      const legacyEntry = normalizeAnimalEntry(legacy[uid]);
      const remoteAnimal = normalizeAnimalEntry(remote.profileAnimal);

      const profile = normalizeProfile(uid, {
        ...remote,
        profileAnimal: remoteAnimal ?? legacyEntry,
      });

      setCachedProfile(uid, profile);
      if (profile.profileAnimal) syncLegacyAnimalCache(uid, profile.profileAnimal);
    }
  })().catch((err) => {
    initPromise = null;
    console.warn('initUserProfiles:', err.message);
  });

  return initPromise;
}

export function clearUserProfilesCache() {
  profilesByUid.clear();
  initPromise = null;
}
