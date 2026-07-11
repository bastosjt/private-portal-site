import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyARSF6DZul3r5lrIaYZzAhrBkSGc9jwvD0',
  authDomain: 'couple-space-cefb4.firebaseapp.com',
  projectId: 'couple-space-cefb4',
  storageBucket: 'couple-space-cefb4.firebasestorage.app',
  messagingSenderId: '970809524025',
  appId: '1:970809524025:web:1cd272a94045d3e0ccb2e8',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
