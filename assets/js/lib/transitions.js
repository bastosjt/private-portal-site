export function waitForTransition(element, durationMs) {
  if (!element) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      element.removeEventListener('transitionend', onEnd);
      resolve();
    };

    const onEnd = (event) => {
      if (event.target === element) finish();
    };

    element.addEventListener('transitionend', onEnd);
    window.setTimeout(finish, durationMs + 60);
  });
}

export function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}
