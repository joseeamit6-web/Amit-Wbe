import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
}

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulseOffset: number;
}

interface HexToken {
  xRatio: number;
  yRatio: number;
  text: string;
  nextChangeAt: number;
  alpha: number;
}

const HEX_CHARS = '0123456789ABCDEF';

function randomHexPair(): string {
  const a = HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
  const b = HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
  return `${a}${b}`;
}

function generateHexToken(): string {
  const format = Math.random();
  if (format < 0.45) {
    return `0x${randomHexPair()}`;
  }
  if (format < 0.8) {
    return `${randomHexPair()} ${randomHexPair()}`;
  }
  return `${randomHexPair()}:${randomHexPair()}`;
}

export function CyberScannerBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = mediaQuery.matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let animationFrameId = 0;

    // Seed particles
    const particleCount = 38;
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -0.08 - Math.random() * 0.22,
      radius: 0.7 + Math.random() * 1.1,
      alpha: 0.12 + Math.random() * 0.24,
      phase: Math.random() * Math.PI * 2,
    }));

    // Seed network nodes (kept subtle)
    const nodeCount = 24;
    const nodes: NetworkNode[] = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.18,
      radius: 1.1 + Math.random() * 0.9,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    // Seed sparse perimeter/outer-band hexadecimal characters (never crowding center text)
    const hexAnchors: Array<[number, number]> = [
      [0.08, 0.14],
      [0.21, 0.11],
      [0.77, 0.12],
      [0.91, 0.17],
      [0.06, 0.36],
      [0.93, 0.39],
      [0.07, 0.67],
      [0.92, 0.65],
      [0.11, 0.85],
      [0.29, 0.88],
      [0.71, 0.87],
      [0.88, 0.83],
    ];

    const hexTokens: HexToken[] = hexAnchors.map(([xRatio, yRatio], idx) => ({
      xRatio,
      yRatio,
      text: generateHexToken(),
      nextChangeAt: idx * 350 + Math.random() * 1400,
      alpha: 0.08 + (idx % 3) * 0.025,
    }));

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const handleMotionChange = (event: MediaQueryListEvent) => {
      prefersReducedMotion = event.matches;
      if (prefersReducedMotion) {
        cancelAnimationFrame(animationFrameId);
        drawFrame(performance.now(), true);
      } else {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    mediaQuery.addEventListener('change', handleMotionChange);
    window.addEventListener('resize', resize);

    function drawFrame(now: number, isStatic: boolean) {
      if (!ctx) return;

      const t = isStatic ? 3200 : now;
      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;

      // 1. Subtle digital grid with radial falloff + scan illumination
      const gridSize = width < 640 ? 44 : 60;
      const scanPeriodMs = 9500;
      const scanProgress = (t % scanPeriodMs) / scanPeriodMs;
      const beamY = -120 + scanProgress * (height + 240);

      // Secondary slow counter-scanning line
      const subScanProgress = ((t + 4200) % 13000) / 13000;
      const subBeamY = height + 60 - subScanProgress * (height + 120);

      const maxDist = Math.hypot(cx, cy) || 1;

      ctx.lineWidth = 1;
      for (let x = (width % gridSize) / 2; x < width; x += gridSize) {
        const dx = Math.abs(x - cx) / (width * 0.52);
        const edgeFade = Math.max(0.08, 1 - dx * dx * 0.9);
        ctx.strokeStyle = `rgba(0, 215, 255, ${(0.036 * edgeFade).toFixed(4)})`;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
      }

      for (let y = (height % gridSize) / 2; y < height; y += gridSize) {
        const dy = Math.abs(y - cy) / (height * 0.55);
        const edgeFade = Math.max(0.08, 1 - dy * dy * 0.9);
        const nearBeam = Math.max(0, 1 - Math.abs(y - beamY) / 90);
        const lineAlpha = 0.032 * edgeFade + nearBeam * 0.045;
        ctx.strokeStyle = `rgba(0, 225, 255, ${lineAlpha.toFixed(4)})`;
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }

      // Highlight subtle grid intersection crosshairs near the active scan beam
      for (let x = (width % gridSize) / 2; x < width; x += gridSize) {
        for (let y = (height % gridSize) / 2; y < height; y += gridSize) {
          const distToBeam = Math.abs(y - beamY);
          if (distToBeam < 75) {
            const distFromCenter = Math.hypot(x - cx, y - cy) / maxDist;
            const intensity = (1 - distToBeam / 75) * (1 - distFromCenter * 0.65);
            if (intensity > 0.05) {
              ctx.fillStyle = `rgba(0, 235, 255, ${(intensity * 0.28).toFixed(4)})`;
              ctx.fillRect(x - 0.5, y - 0.5, 2, 2);
            }
          }
        }
      }

      // 2. Scanning radar effect (concentric faint rings + slow rotating sweep)
      const radarRadius = Math.min(width, height) * 0.41;
      const ringFactors = [0.42, 0.7, 1.0];
      ringFactors.forEach((factor, idx) => {
        const r = radarRadius * factor;
        ctx.strokeStyle = `rgba(0, 225, 255, ${idx === 1 ? 0.042 : 0.026})`;
        ctx.lineWidth = 1;
        if (idx === 1) {
          ctx.setLineDash([3, 7]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Expanding subtle pulse wave from center
      const pulseCycle = (t % 6800) / 6800;
      const pulseRadius = radarRadius * (0.18 + pulseCycle * 0.92);
      const pulseAlpha = (1 - pulseCycle) * 0.06;
      if (pulseAlpha > 0.004) {
        ctx.strokeStyle = `rgba(0, 230, 255, ${pulseAlpha.toFixed(4)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Rotating radar sweep arc
      const radarAngle = (t * 0.00042) % (Math.PI * 2);
      const wedgeSpan = 0.65; // radians (~37 deg)
      const sweepSteps = 14;
      for (let i = 0; i < sweepSteps; i++) {
        const startA = radarAngle - (wedgeSpan * (i + 1)) / sweepSteps;
        const endA = radarAngle - (wedgeSpan * i) / sweepSteps;
        const stepAlpha = ((sweepSteps - i) / sweepSteps) * 0.032;
        ctx.fillStyle = `rgba(0, 229, 255, ${stepAlpha.toFixed(4)})`;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radarRadius, startA, endA);
        ctx.closePath();
        ctx.fill();
      }

      // Thin radar sweep leading vector
      ctx.strokeStyle = 'rgba(0, 235, 255, 0.11)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(radarAngle) * radarRadius,
        cy + Math.sin(radarAngle) * radarRadius
      );
      ctx.stroke();

      // 3. Animated network connection points
      const linkDist = width < 640 ? 115 : 165;
      if (!isStatic) {
        for (const node of nodes) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        // Dampen opacity right behind central headline band so text stays crisp
        const inCenterBand =
          Math.abs(a.x - cx) < Math.min(width * 0.34, 420) &&
          Math.abs(a.y - cy) < 110;
        const centerScale = inCenterBand ? 0.35 : 1;

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < linkDist) {
            const lineAlpha = (1 - d / linkDist) * 0.085 * centerScale;
            ctx.strokeStyle = `rgba(0, 220, 255, ${lineAlpha.toFixed(4)})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        const beamBoost = Math.max(0, 1 - Math.abs(a.y - beamY) / 85);
        const nodePulse = 0.5 + 0.5 * Math.sin(t * 0.002 + a.pulseOffset);
        const nodeAlpha = (0.1 + nodePulse * 0.08 + beamBoost * 0.16) * centerScale;
        ctx.fillStyle = `rgba(34, 211, 238, ${nodeAlpha.toFixed(4)})`;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Small floating digital particles
      for (const p of particles) {
        if (!isStatic) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
        }
        const shimmer = 0.65 + 0.35 * Math.sin(t * 0.0024 + p.phase);
        ctx.fillStyle = `rgba(103, 232, 249, ${(p.alpha * shimmer).toFixed(4)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Random hexadecimal characters & faint technical coordinates
      ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
      ctx.textBaseline = 'middle';

      for (const token of hexTokens) {
        if (!isStatic && t > token.nextChangeAt) {
          token.text = generateHexToken();
          token.nextChangeAt = t + 1400 + Math.random() * 2600;
        }
        const tx = token.xRatio * width;
        const ty = token.yRatio * height;
        const beamGlow = Math.max(0, 1 - Math.abs(ty - beamY) / 80);
        const alpha = token.alpha + beamGlow * 0.14;
        ctx.fillStyle = `rgba(34, 211, 238, ${alpha.toFixed(4)})`;
        ctx.fillText(token.text, tx, ty);
      }

      // Faint technical coordinates along outer perimeter (desktop/tablet)
      if (width >= 640) {
        ctx.font = '9.5px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillStyle = 'rgba(148, 197, 214, 0.16)';
        const beamNorm = Math.max(0, Math.min(1, beamY / Math.max(height, 1))).toFixed(2);
        ctx.fillText('27.7172 N  85.3240 E', 28, 30);
        ctx.fillText(`SCAN Y:${beamNorm}`, width - 114, 30);
        ctx.fillText('GRID 01 // SEC-04', 28, height - 26);
      }

      // 6. Moving horizontal neon-cyan scanning beam
      const beamHeight = 135;
      const beamGrad = ctx.createLinearGradient(0, beamY - beamHeight, 0, beamY + 12);
      beamGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
      beamGrad.addColorStop(0.75, 'rgba(0, 229, 255, 0.038)');
      beamGrad.addColorStop(0.92, 'rgba(0, 235, 255, 0.12)');
      beamGrad.addColorStop(1, 'rgba(0, 235, 255, 0)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, beamY - beamHeight, width, beamHeight + 12);

      // Razor-sharp glowing leading edge of the horizontal scan beam
      const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
      lineGrad.addColorStop(0, 'rgba(0, 235, 255, 0.02)');
      lineGrad.addColorStop(0.2, 'rgba(0, 235, 255, 0.22)');
      lineGrad.addColorStop(0.5, 'rgba(103, 245, 255, 0.34)');
      lineGrad.addColorStop(0.8, 'rgba(0, 235, 255, 0.22)');
      lineGrad.addColorStop(1, 'rgba(0, 235, 255, 0.02)');
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, beamY + 0.5);
      ctx.lineTo(width, beamY + 0.5);
      ctx.stroke();

      // Slowly moving secondary subtle horizontal scanning line
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.075)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, subBeamY + 0.5);
      ctx.lineTo(width, subBeamY + 0.5);
      ctx.stroke();
    }

    function loop(now: number) {
      drawFrame(now, false);
      animationFrameId = requestAnimationFrame(loop);
    }

    if (prefersReducedMotion) {
      drawFrame(performance.now(), true);
    } else {
      animationFrameId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      mediaQuery.removeEventListener('change', handleMotionChange);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#030608]"
    >
      {/* Subtle dark cyan ambient radial lights matching reference image */}
      <div
        className="portal-ambient-pulse absolute -top-[10%] left-[8%] h-[58vw] max-h-[680px] w-[58vw] max-w-[680px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(0, 175, 205, 0.13) 0%, rgba(0, 120, 150, 0.045) 42%, transparent 72%)',
        }}
      />
      <div
        className="portal-ambient-pulse absolute -bottom-[14%] right-[4%] h-[48vw] max-h-[560px] w-[48vw] max-w-[560px] rounded-full"
        style={{
          animationDelay: '-4.5s',
          background:
            'radial-gradient(circle, rgba(0, 165, 195, 0.11) 0%, rgba(0, 105, 135, 0.035) 44%, transparent 72%)',
        }}
      />

      {/* Interactive-free continuous futuristic cyber scanner canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Subtle drifting horizontal scanlines */}
      <div className="portal-scanlines absolute -top-4 right-0 bottom-0 left-0 opacity-60" />

      {/* Gentle edge vignette to anchor focus on the central composition */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 70% at 50% 50%, transparent 45%, rgba(2, 4, 6, 0.62) 100%)',
        }}
      />
    </div>
  );
}
