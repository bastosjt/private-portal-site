import { HOME_CATEGORIES } from '../config.js';
import { db } from './config.js';
import { devWarn } from '../lib/dev-log.js';
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

const IMMUTABLE_ITEM_FIELDS = ['createdBy', 'userId', 'createdAt'];

const COMMON_ITEM_FIELDS = new Set([
  'done',
  'fait',
  'latitude',
  'longitude',
  'prix',
  'prixMin',
  'prixMax',
  'country',
  'mapsUrl',
  'createdAt',
  'updatedAt',
  'createdBy',
  'userId',
]);

const COLLECTION_FIELD_ALLOWLIST = Object.fromEntries(
  HOME_CATEGORIES.map((category) => {
    const allowed = new Set([
      ...category.fields.map((field) => field.name),
      ...COMMON_ITEM_FIELDS,
    ]);
    return [category.id, allowed];
  }),
);

function stripImmutableItemFields(data) {
  const sanitized = { ...data };
  for (const key of IMMUTABLE_ITEM_FIELDS) {
    delete sanitized[key];
  }
  return sanitized;
}

function sanitizeFetchedItem(collectionName, id, data) {
  const allowed = COLLECTION_FIELD_ALLOWLIST[collectionName];
  if (!allowed) return { id, ...data };

  const item = { id };
  for (const [key, value] of Object.entries(data)) {
    if (allowed.has(key)) item[key] = value;
  }
  return item;
}

export async function fetchAllItems(collectionName) {
  try {
    const q = query(
      collection(db, collectionName),
      orderBy('createdAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((entry) => sanitizeFetchedItem(collectionName, entry.id, entry.data()));
  } catch (err) {
    devWarn(`fetchAllItems(${collectionName}):`, err.message);
    return [];
  }
}

export async function addItem(collectionName, data, userId) {
  const now = Timestamp.now();
  const payload = {
    ...data,
    userId,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, collectionName), payload);
  return docRef.id;
}

export async function updateItem(collectionName, id, data) {
  const ref = doc(db, collectionName, id);
  await updateDoc(ref, {
    ...stripImmutableItemFields(data),
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
    devWarn('fetchAllCustomOptions:', err.message);
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
