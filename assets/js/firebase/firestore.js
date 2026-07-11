import { db } from './config.js';
import {
  collection,
  query,
  orderBy,
  getDocs,
  setDoc,
  Timestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const CUSTOM_OPTIONS_COLLECTION = 'customOptions';

export async function fetchAllItems(collectionName) {
  try {
    const q = query(
      collection(db, collectionName),
      orderBy('createdAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn(`fetchAllItems(${collectionName}):`, err.message);
    return [];
  }
}

export async function addItem(collectionName, data, userId) {
  const now = Timestamp.now();
  const payload = {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, collectionName), payload);
  return docRef.id;
}

export async function updateItem(collectionName, id, data) {
  const ref = doc(db, collectionName, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteItem(collectionName, id) {
  await deleteDoc(doc(db, collectionName, id));
}

export async function fetchAllCustomOptions() {
  try {
    const snapshot = await getDocs(collection(db, CUSTOM_OPTIONS_COLLECTION));
    const result = {};

    snapshot.docs.forEach((entry) => {
      const options = entry.data().options;
      if (Array.isArray(options)) {
        result[entry.id] = options;
      }
    });

    return result;
  } catch (err) {
    console.warn('fetchAllCustomOptions:', err.message);
    return {};
  }
}

export async function persistCustomOptions(storageKey, options) {
  const ref = doc(db, CUSTOM_OPTIONS_COLLECTION, storageKey);
  await setDoc(ref, {
    options,
    updatedAt: Timestamp.now(),
  }, { merge: true });
}
