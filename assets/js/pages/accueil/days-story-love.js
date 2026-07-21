import { createLoveHeartsController } from '../../lib/love-hearts.js';

let daysStoryLoveController = null;

export function initDaysStoryLoveHearts() {
  destroyDaysStoryLoveHearts();

  const card = document.querySelector('.hero-days');
  const container = document.getElementById('days-story-love-hearts');
  const trigger = document.getElementById('days-story-heart-trigger');

  if (!card || !container) return;

  daysStoryLoveController = createLoveHeartsController({
    container,
    root: card,
    trigger,
    placementMode: 'card',
    proceduralCount: 78,
    keepOutRoot: card,
    keepOutSelectors: [
      '.days-card-content',
      '.days-story-since',
      '.hero-scene',
    ],
  });
}

export function destroyDaysStoryLoveHearts() {
  daysStoryLoveController?.destroy();
  daysStoryLoveController = null;
}
