export {
  PROFILE_ANIMALS,
  PROFILE_ANIMAL_COLORS,
  DEFAULT_PROFILE_COLOR,
} from './profile-animal-data.js';

import { PROFILE_ANIMAL_COLORS, PROFILE_ANIMALS } from './profile-animal-data.js';
import { getProfileAnimalEntry } from './user-profile.js';

export function getProfileAnimalColorStyle(colorId) {
  return PROFILE_ANIMAL_COLORS.find((color) => color.id === colorId)
    ?? PROFILE_ANIMAL_COLORS[0];
}

export function getProfileAnimalMeta(animalId) {
  return PROFILE_ANIMALS.find((animal) => animal.id === animalId) ?? null;
}

export function applyAnimalAvatarStyles(el, uid) {
  if (!el) return;

  const entry = getProfileAnimalEntry(uid);
  if (!entry) {
    el.classList.remove('has-animal');
    el.style.background = '';
    el.style.border = '';
    el.style.color = '';
    el.style.boxShadow = '';
    return;
  }

  const style = getProfileAnimalColorStyle(entry.color);
  el.classList.add('has-animal');
  el.style.background = style.gradient;
  el.style.border = `1px solid ${style.border}`;
  el.style.color = style.iconColor;
  el.style.boxShadow = `var(--neu-up-sm), 0 0 16px ${style.glow}`;
}

export {
  clearProfileAnimal,
  getProfileAnimal,
  getProfileAnimalColor,
  getProfileAnimalEntry,
  setProfileAnimal,
} from './user-profile.js';
