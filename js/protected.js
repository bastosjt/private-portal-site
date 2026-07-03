import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { logout } from './auth.js';

const ALLOWED_UIDS = new Set([
  'fiiTfAA6tWRWSiIi9mhni91XU2y1',
  'by7lDskaTvPBOqEg3OOBXw0GWWw1',
]);

let denyInProgress = false;

export function isAllowedUser(user) {
  return user != null && ALLOWED_UIDS.has(user.uid);
}

function getAccessStatus(user) {
  if (!user) return 'unauthenticated';
  if (!isAllowedUser(user)) return 'forbidden';
  return 'allowed';
}

async function denyAccess(redirectTo = 'index.html') {
  if (denyInProgress) return;
  denyInProgress = true;

  try {
    await logout();
  } catch {
    // On redirige même si la déconnexion échoue
  }

  const url = new URL(redirectTo, window.location.href);
  url.searchParams.set('error', 'unauthorized');
  window.location.replace(url.pathname + url.search);
}

function waitForAuthDecision() {
  return new Promise((resolve) => {
    let settled = false;

    const decide = (status, user = null) => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve({ status, user });
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      decide(getAccessStatus(user), user);
    });
  });
}

export async function requireAuth(redirectTo = 'index.html') {
  const { status, user } = await waitForAuthDecision();

  if (status === 'allowed') return user;
  if (status === 'forbidden') {
    await denyAccess(redirectTo);
    return null;
  }

  window.location.replace(redirectTo);
  return null;
}

export async function redirectIfLoggedIn(redirectTo = 'accueil.html') {
  const { status } = await waitForAuthDecision();

  if (status === 'allowed') {
    window.location.replace(redirectTo);
  } else if (status === 'forbidden') {
    await denyAccess('index.html');
  }
}
