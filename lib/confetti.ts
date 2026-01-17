// Premium confetti utility with high-performance animations
export function triggerConfetti() {
  if (typeof window === 'undefined') return;

  import('canvas-confetti')
    .then((confetti) => {
      const module = confetti.default;

      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        zIndex: 10000,
        colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']
      };

      function fire(particleRatio: number, opts: any) {
        module({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio)
        });
      }

      // Professional Cannon sequence
      // 1. Initial burst
      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      });

      // 2. Wide spread
      fire(0.2, {
        spread: 60,
      });

      // 3. High scattered
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8
      });

      // 4. Low fast
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2
      });

      // 5. Directional side bursts
      setTimeout(() => {
        module({
          ...defaults,
          particleCount: 40,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        module({
          ...defaults,
          particleCount: 40,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 150);

      // 6. Last "sparkle" rain
      setTimeout(() => {
        fire(0.1, {
          spread: 120,
          startVelocity: 45,
        });
      }, 300);
    })
    .catch((err) => {
      console.warn('Confetti import failed:', err);
    });
}
