"use client";

import { useEffect, useRef } from "react";

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
    if (!confettiRef.current) return;

    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Left side confetti
      confettiRef.current({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });

      // Right side confetti
      confettiRef.current({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    // Final burst
    setTimeout(() => {
      confettiRef.current({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444']
      });
    }, 100);
  };
}


