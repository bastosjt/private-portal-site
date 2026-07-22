import { ensurePrefetch } from '../../data/appDataCache.js';
import { renderExplorerSection } from '../../ui/explorer-section.js';

async function loadExplorerData() {
  await ensurePrefetch();
  renderExplorerSection(document.getElementById('home-explorer'));
}

export async function initExplorerPage() {
  await loadExplorerData();
}

export function refreshExplorerPage() {
  return loadExplorerData();
}

export function destroyExplorerPage() {}
