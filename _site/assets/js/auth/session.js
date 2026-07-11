/** UIDs Firebase — espace couple (données réelles) */
const COUPLE_UIDS = new Set([
  'fiiTfAA6tWRWSiIi9mhni91XU2y1',
  'by7lDskaTvPBOqEg3OOBXw0GWWw1',
]);

/**
 * UIDs Firebase — espace démo (données isolées sous workspaces/demo/).
 * Doit correspondre à l'UID réel dans Firebase Auth (voir console au login démo).
 */
const DEMO_UIDS = new Set([
  '7ZzhDLTZHCarY6J7lRj2uhLKMPw2',
]);

/** Emails autorisés en espace démo (évite les erreurs si l'UID copié ne correspond pas). */
const DEMO_EMAILS = new Set([
  'test@ourspace.com',
]);

function normalizeEmail(email) {
  return email?.trim().toLowerCase() || '';
}

function isDemoUser(user) {
  if (!user) return false;
  return DEMO_UIDS.has(user.uid) || DEMO_EMAILS.has(normalizeEmail(user.email));
}

/** @param {import('firebase/auth').User | null} user */
export function isAllowedUser(user) {
  if (!user) return false;
  return COUPLE_UIDS.has(user.uid) || isDemoUser(user);
}

/** @param {import('firebase/auth').User | null} user */
export function resolveWorkspaceIdForUser(user) {
  if (!user) return null;
  if (COUPLE_UIDS.has(user.uid)) return 'couple';
  if (isDemoUser(user)) return 'demo';
  return null;
}

/** @param {import('firebase/auth').User | null} user */
export function warnIfDemoUidMismatch(user) {
  if (!user || !isDemoUser(user)) return;
  if (DEMO_UIDS.has(user.uid)) return;

  console.warn(
    '[Our Space] Compte démo reconnu par email, mais l\'UID ne correspond pas à DEMO_UIDS.',
    'UID actuel :',
    user.uid,
    '— mets à jour assets/js/auth/session.js et dev/firestore.rules avec cet UID.',
  );
}
