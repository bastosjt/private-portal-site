import { db } from './firebase-config.js';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
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
