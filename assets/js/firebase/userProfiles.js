import { db } from './config.js';
import { devWarn } from '../lib/dev-log.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const USERS_COLLECTION = 'users';

export async function fetchAllUserProfiles() {
  try {
    const snapshot = await getDocs(collection(db, USERS_COLLECTION));
    const result = {};
    snapshot.docs.forEach((entry) => {
      result[entry.id] = entry.data();
    });
    return result;
  } catch (err) {
    devWarn('fetchAllUserProfiles:', err.message);
    return {};
  }
}

export async function fetchUserProfile(uid) {
  if (!uid) return null;
  try {
    const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
    return snapshot.exists() ? snapshot.data() : null;
  } catch (err) {
    devWarn(`fetchUserProfile(${uid}):`, err.message);
    return null;
  }
}

export async function upsertUserProfile(uid, data) {
  if (!uid) return;
  await setDoc(doc(db, USERS_COLLECTION, uid), {
    ...data,
    updatedAt: Timestamp.now(),
  }, { merge: true });
}
