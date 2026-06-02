import { useEffect, useRef } from 'react';

interface ConfettiProps {
  onDone: () => void;
}

const COLORS = ['#ff4f4f', '#ffcc00', '#4caf50', '#2196f3', '#e91e63', '#ff9800'];
const PARTICLES_PER_CANNON = 60;
const DURATION_MS = 2500;
const FADE_MS = 400;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  color: string;
  isRect: boolean;
  alpha: number;
}

function makeParticles(w: number): Particle[] {
  const particles: Particle[] = [];

  // Left cannon: fires from (10% W, 0) downward-right, angles 20°–80°
  for (let i = 0; i < PARTICLES_PER_CANNON; i++) {
    const angle = Math.PI / 9 + Math.random() * ((Math.PI * 5) / 18); // 20° to 80°
    const speed = 5 + Math.random() * 6;
    particles.push({
      x: w * 0.1,
      y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.25,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      isRect: Math.random() > 0.4,
      alpha: 1,
    });
  }

  // Right cannon: fires from (90% W, 0) downward-left, angles 100°–160°
  for (let i = 0; i < PARTICLES_PER_CANNON; i++) {
    const angle = (Math.PI * 5) / 9 + Math.random() * ((Math.PI * 5) / 18); // 100° to 160°
    const speed = 5 + Math.random() * 6;
    particles.push({
      x: w * 0.9,
      y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.25,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      isRect: Math.random() > 0.4,
      alpha: 1,
    });
  }

  return particles;
}

export function Confetti({ onDone }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = makeParticles(window.innerWidth);
    const startTime = performance.now();
    let rafId = 0;

    function draw(now: number) {
      const elapsed = now - startTime;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      for (const p of particles) {
        p.vy += 0.15; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        if (elapsed > DURATION_MS) {
          p.alpha = Math.max(0, 1 - (elapsed - DURATION_MS) / FADE_MS);
        }

        ctx!.save();
        ctx!.globalAlpha = p.alpha;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rotation);
        ctx!.fillStyle = p.color;

        if (p.isRect) {
          ctx!.fillRect(-4, -2, 8, 4);
        } else {
          ctx!.beginPath();
          ctx!.arc(0, 0, 4, 0, Math.PI * 2);
          ctx!.fill();
        }

        ctx!.restore();
      }

      if (elapsed < DURATION_MS + FADE_MS) {
        rafId = requestAnimationFrame(draw);
      } else {
        onDone();
      }
    }

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200 }}
    />
  );
}
