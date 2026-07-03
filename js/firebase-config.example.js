// Copier ce fichier vers firebase-config.js et remplir avec tes valeurs Firebase.
// cp js/firebase-config.example.js js/firebase-config.js
//
// En production, le fichier est généré automatiquement par GitHub Actions
// à partir des secrets du dépôt.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'TA_CLE_API',
  authDomain: 'ton-projet.firebaseapp.com',
  projectId: 'ton-projet',
  storageBucket: 'ton-projet.firebasestorage.app',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:xxxxxxxxxxxxxxxx',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
