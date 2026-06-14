"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(true);
  const [logoOpacity, setLogoOpacity] = useState(0);
  const [taglineOpacity, setTaglineOpacity] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const [exitClass, setExitClass] = useState("");

  const handleDone = useCallback(onDone, [onDone]);

  /* ── Canvas particles ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      r: number; alpha: number; color: string;
    }

    const COLORS = ["#7c3aed", "#06b6d4", "#a78bfa", "#67e8f9", "#c4b5fd"];
    const COUNT = 160;
    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.55,
      r: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.6 + 0.2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(124,58,237,${0.12 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
        const p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle =
          p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* ── Animation timeline ── */
  useEffect(() => {
    const t1 = setTimeout(() => setLogoOpacity(1), 400);
    const t2 = setTimeout(() => setTaglineOpacity(1), 1100);
    const t3 = setTimeout(() => setBarWidth(100), 1300);
    const t4 = setTimeout(() => setExitClass("splash-exit"), 3200);
    const t5 = setTimeout(() => { setVisible(false); handleDone(); }, 3900);
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
  }, [handleDone]);

  if (!visible) return null;

  return (
    <div
      className={`splash-root ${exitClass}`}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#050814",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Radial glows */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background:
          "radial-gradient(circle at 30% 40%, rgba(124,58,237,0.38) 0%, transparent 50%), " +
          "radial-gradient(circle at 72% 65%, rgba(6,182,212,0.22) 0%, transparent 45%)",
      }} />

      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

      {/* Center content */}
      <div style={{ position: "relative", textAlign: "center", userSelect: "none" }}>

        {/* Pulsing rings */}
        {[160, 210, 265].map((size, i) => (
          <div key={size} style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: size, height: size,
            borderRadius: "50%",
            border: `1px solid ${i % 2 === 0 ? "rgba(124,58,237,0.3)" : "rgba(6,182,212,0.2)"}`,
            animation: `splashRing 2.8s ease-in-out ${i * 0.5}s infinite`,
            opacity: logoOpacity,
            transition: "opacity 0.5s",
          }} />
        ))}

        {/* Logo real */}
        <div style={{
          opacity: logoOpacity,
          transform: logoOpacity ? "scale(1) translateY(0)" : "scale(0.82) translateY(24px)",
          transition: "opacity 0.75s cubic-bezier(0.16,1,0.3,1), transform 0.75s cubic-bezier(0.16,1,0.3,1)",
          marginBottom: 22,
          display: "flex",
          justifyContent: "center",
        }}>
          <Image
            src="/logo-vosmart.png"
            alt="VoSmart"
            width={320}
            height={180}
            priority
            style={{
              width: "clamp(220px, 35vw, 340px)",
              height: "auto",
              filter: "drop-shadow(0 0 30px rgba(124,58,237,0.5)) drop-shadow(0 0 60px rgba(6,182,212,0.2))",
            }}
          />
        </div>

        {/* Tagline */}
        <div style={{
          opacity: taglineOpacity,
          transform: taglineOpacity ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
          fontSize: "clamp(0.7rem, 1.8vw, 0.9rem)",
          color: "rgba(148,163,184,0.85)",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          marginBottom: 52,
          fontFamily: "system-ui, sans-serif",
        }}>
          Firmă de cenzorat&nbsp;·&nbsp;Portal online&nbsp;·&nbsp;Rapoarte lunare
        </div>

        {/* Progress bar */}
        <div style={{
          width: "clamp(200px, 28vw, 300px)",
          height: 2,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 999,
          overflow: "hidden",
          margin: "0 auto",
          opacity: taglineOpacity,
          transition: "opacity 0.4s",
        }}>
          <div style={{
            height: "100%",
            width: `${barWidth}%`,
            background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
            borderRadius: 999,
            transition: `width ${barWidth === 100 ? "1.85s" : "0s"} cubic-bezier(0.4,0,0.2,1)`,
            boxShadow: "0 0 14px rgba(124,58,237,0.9)",
          }} />
        </div>
      </div>

      <style>{`
        @keyframes splashRing {
          0%   { transform: translate(-50%, -50%) scale(1);    opacity: 0.55; }
          50%  { transform: translate(-50%, -50%) scale(1.14); opacity: 0.12; }
          100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.55; }
        }
        .splash-exit {
          animation: splashExitAnim 0.72s cubic-bezier(0.4,0,0.2,1) forwards;
        }
        @keyframes splashExitAnim {
          0%   { opacity: 1; transform: scale(1); }
          35%  { opacity: 1; transform: scale(1.04); }
          100% { opacity: 0; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}
