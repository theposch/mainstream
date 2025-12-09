import confetti from 'canvas-confetti';

/**
 * Triggers a celebratory confetti explosion from the sides.
 * Best used for major milestones like publishing a drop.
 */
export function triggerConfetti() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // since particles fall down, start a bit higher than random
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#22c55e', '#3b82f6', '#a855f7', '#f43f5e'] // Brand colors
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#22c55e', '#3b82f6', '#a855f7', '#f43f5e']
    });
  }, 250);
}

/**
 * Triggers a small, subtle confetti burst from the center.
 * Best used for frequent actions like uploading or saving.
 */
export function triggerSmallConfetti() {
  confetti({
    particleCount: 40,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#22c55e', '#3b82f6', '#a855f7'], // Green, Blue, Purple
    disableForReducedMotion: true,
    zIndex: 9999, // Ensure it's on top of modals
  });
}

