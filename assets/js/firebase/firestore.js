import { db } from './config.js';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  setDoc,
  where,
  Timestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import { getCollectionSegments, getDocSegments } from '../auth/workspace.js';

const CUSTOM_OPTIONS_COLLECTION = 'customOptions';

function itemsCollection(collectionName) {
  return collection(db, ...getCollectionSegments(collectionName));
}

function itemDoc(collectionName, id) {
  return doc(db, ...getDocSegments(collectionName, id));
}

export async function fetchRecentItems(collectionName, max = 3) {
  try {
    const q = query(
      itemsCollection(collectionName),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  } catch (err) {
    console.warn(`fetchRecentItems(${collectionName}):`, err.message);
    return [];
  }
}

export async function fetchCollectionCount(collectionName) {
  try {
    const snapshot = await getDocs(itemsCollection(collectionName));
    return snapshot.size;
  } catch (err) {
    console.warn(`fetchCollectionCount(${collectionName}):`, err.message);
    return 0;
  }
}

export async function fetchWeekItemsCount(collectionNames) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);
  const since = Timestamp.fromDate(weekAgo);

  const counts = await Promise.all(
    collectionNames.map(async (name) => {
      try {
        const q = query(
          itemsCollection(name),
          where('createdAt', '>=', since),
        );
        const snapshot = await getDocs(q);
        return snapshot.size;
      } catch (err) {
        console.warn(`fetchWeekItemsCount(${name}):`, err.message);
        return 0;
      }
    }),
  );

  return counts.reduce((sum, n) => sum + n, 0);
}

export async function fetchAllItems(collectionName) {
  try {
    const q = query(
      itemsCollection(collectionName),
      orderBy('createdAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
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

  const docRef = await addDoc(itemsCollection(collectionName), payload);
  return docRef.id;
}

export async function updateItem(collectionName, id, data) {
  const ref = itemDoc(collectionName, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteItem(collectionName, id) {
  await deleteDoc(itemDoc(collectionName, id));
}

export async function fetchAllCustomOptions() {
  try {
    const snapshot = await getDocs(itemsCollection(CUSTOM_OPTIONS_COLLECTION));
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
  const ref = itemDoc(CUSTOM_OPTIONS_COLLECTION, storageKey);
  await setDoc(ref, {
    options,
    updatedAt: Timestamp.now(),
  }, { merge: true });
}
