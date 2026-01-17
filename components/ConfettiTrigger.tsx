"use client";

import { useEffect, useRef } from "react";
import { triggerConfetti } from "@/lib/confetti";

export function useConfetti() {
  const confettiRef = useRef<any>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || loadingRef.current) return;

    loadingRef.current = true;
    import('canvas-confetti')
      .then((module) => {
        confettiRef.current = module.default;
      })
      .catch(() => {
        console.warn('canvas-confetti not available');
      });
  }, []);

  return () => {
    if (!confettiRef.current) {
      // Fallback to the utility if ref isn't ready
      triggerConfetti();
      return;
    }

    const module = confettiRef.current;
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

    // High performance sequence
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });

    setTimeout(() => {
      module({ ...defaults, particleCount: 40, angle: 60, spread: 55, origin: { x: 0 } });
      module({ ...defaults, particleCount: 40, angle: 120, spread: 55, origin: { x: 1 } });
    }, 150);
  };
}
