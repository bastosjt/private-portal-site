import { resolveWorkspaceIdForUser } from './session.js';

/** @typedef {'couple' | 'demo'} WorkspaceId */

/** @type {WorkspaceId | null} */
let activeWorkspaceId = null;

export const WORKSPACES = {
  couple: {
    id: 'couple',
    tagline: 'À nous deux',
    showCoupleStory: true,
    isDemo: false,
  },
  demo: {
    id: 'demo',
    tagline: 'Espace démo',
    showCoupleStory: false,
    isDemo: true,
  },
};

/**
 * @param {import('firebase/auth').User} user
 * @returns {WorkspaceId | null}
 */
export function resolveWorkspaceId(user) {
  return resolveWorkspaceIdForUser(user);
}

/**
 * @param {WorkspaceId | null} workspaceId
 */
export function setActiveWorkspace(workspaceId) {
  activeWorkspaceId = workspaceId;
  document.body.classList.toggle('is-demo-workspace', workspaceId === 'demo');
}

export function getActiveWorkspaceId() {
  return activeWorkspaceId;
}

export function getActiveWorkspace() {
  if (!activeWorkspaceId) return WORKSPACES.couple;
  return WORKSPACES[activeWorkspaceId] || WORKSPACES.couple;
}

export function isDemoWorkspace() {
  return activeWorkspaceId === 'demo';
}

/**
 * @param {string} collectionName
 * @returns {import('firebase/firestore').CollectionReference}
 */
export function getCollectionSegments(collectionName) {
  if (activeWorkspaceId === 'demo') {
    return ['workspaces', 'demo', collectionName];
  }
  return [collectionName];
}

/**
 * @param {string} collectionName
 * @param {string} docId
 * @returns {string[]}
 */
export function getDocSegments(collectionName, docId) {
  return [...getCollectionSegments(collectionName), docId];
}
