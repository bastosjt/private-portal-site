import { auth } from '../firebase/config.js';

export async function ensureAuthSession() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('SESSION_EXPIRED');
  }

  await user.getIdToken(true);
  return user;
}

export function isRetryableFirestoreError(err) {
  const code = err?.code || '';
  return (
    code === 'permission-denied'
    || code === 'unauthenticated'
    || code === 'unavailable'
    || code === 'deadline-exceeded'
    || code === 'network-request-failed'
    || code === 'auth/network-request-failed'
    || err?.message === 'SESSION_EXPIRED'
  );
}

export function getSubmitErrorMessage(err) {
  if (err?.message === 'SESSION_EXPIRED' || err?.code === 'unauthenticated') {
    return 'Session expirée. Reconnectez-vous puis réessayez — votre brouillon est conservé.';
  }

  if (
    err?.code === 'unavailable'
    || err?.code === 'deadline-exceeded'
    || err?.code === 'network-request-failed'
    || err?.code === 'auth/network-request-failed'
    || !navigator.onLine
  ) {
    return 'Connexion interrompue. Vérifiez le réseau et réessayez — votre brouillon est conservé.';
  }

  return 'Impossible d’enregistrer. Réessayez — votre brouillon est conservé.';
}
