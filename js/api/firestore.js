import { db } from '../firebase-config.js';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  Timestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

export async function fetchRecentItems(collectionName, max = 3) {
  try {
    const q = query(
      collection(db, collectionName),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn(`fetchRecentItems(${collectionName}):`, err.message);
    return [];
  }
}

export async function fetchCollectionCount(collectionName) {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
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
          collection(db, name),
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
