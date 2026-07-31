import { db } from './config.js';
import { devWarn } from '../lib/dev-log.js';
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const SPACE_SETTINGS_DOC = 'settings';
const SPACE_COLLECTION = 'space';

export async function fetchSpaceSettings() {
  try {
    const snapshot = await getDoc(doc(db, SPACE_COLLECTION, SPACE_SETTINGS_DOC));
    return snapshot.exists() ? snapshot.data() : null;
  } catch (err) {
    devWarn('fetchSpaceSettings:', err.message);
    return null;
  }
}

export async function upsertSpaceTagline(tagline) {
  await setDoc(doc(db, SPACE_COLLECTION, SPACE_SETTINGS_DOC), {
    tagline,
    updatedAt: Timestamp.now(),
  }, { merge: true });
}

export async function upsertActiveTravelId(activeTravelId) {
  await setDoc(doc(db, SPACE_COLLECTION, SPACE_SETTINGS_DOC), {
    activeTravelId: activeTravelId || null,
    updatedAt: Timestamp.now(),
  }, { merge: true });
}
