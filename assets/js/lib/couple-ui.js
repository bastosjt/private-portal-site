import { COUPLE_UI_ENABLED } from '../config.js';

export function isCoupleUiEnabled() {
  return COUPLE_UI_ENABLED;
}

export function applyCoupleUiDocumentClass() {
  document.documentElement.classList.toggle('couple-ui-off', !COUPLE_UI_ENABLED);
}
