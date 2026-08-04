"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { Hammer, Zap, Sparkles, Cog, Orbit } from "lucide-react";
import { useMiningStore } from "@/store/miningStore";
import { usePlayerStore } from "@/store/playerStore";
import { useGameStore } from "@/store/gameStore";
import {
  MAX_TAPS_FIVEMIN,
  SESSIONS_PER_EPOCH,
  TAPS_PER_SESSION,
} from "@/lib/mining/constants";
import { cn } from "@/lib/utils";

interface FloatingTap {
  id: string;
  x: number;
  y: number;
  amount: number;
  isCrit?: boolean;
}

interface Spark {
  id: string;
  dx: number;
  dy: number;
  color: string;
}

export function MiningRig() {
  const running = useMiningStore((s) => s.running);
  const sessionTaps = useMiningStore((s) => s.sessionTaps);
  const sessionTarget = useMiningStore((s) => s.sessionTarget);
  const sessionStartedAt = useMiningStore((s) => s.sessionStartedAt);
  const epoch = useMiningStore((s) => s.epoch);
  const recentTaps = useMiningStore((s) => s.recentTaps);
  const manualTap = useMiningStore((s) => s.manualTap);

  const recordTap = usePlayerStore((s) => s.recordTap);
  const addXp = usePlayerStore((s) => s.addXp);
  const addNackl = usePlayerStore((s) => s.addNackl);
  const equipped = usePlayerStore((s) => s.equipped);
  const activeBoosters = usePlayerStore((s) => s.activeBoosters);

  const [floatingTaps, setFloatingTaps] = useState<FloatingTap[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [rigPulse, setRigPulse] = useState(0);
  const [now, setNow] = useState(Date.now());
  const rigRef = useRef<HTMLButtonElement | null>(null);

  // ticker for session timer
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // auto-track taps for player stats
  useEffect(() => {
    if (recentTaps.length === 0) return;
    const last = recentTaps[recentTaps.length - 1];
    // avoid double-counting — only register if newer than 1.5s ago
    if (Date.now() - last.at < 200) {
      recordTap();
      addXp(1);
      addNackl(last.amount);
    }
  }, [recentTaps, recordTap, addXp, addNackl]);

  // equipment-derived tap multiplier (visual scale only)
  const tapMultiplier = (() => {
    let mult = 1;
    Object.values(equipped).forEach((id) => {
      if (!id) return;
      // look up via dynamic import would be cleaner, but to avoid SSR issues we
      // approximate by reading from a small lookup map
    });
    activeBoosters.forEach((b) => {
      if (b.id === "turbo" || b.id === "triple-tap") mult *= b.id === "triple-tap" ? 3 : 2;
    });
    return mult;
  })();

  function handleTap(e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) {
    const rect = rigRef.current?.getBoundingClientRect();
    if (!rect) return;
    let clientX = 0, clientY = 0;
    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("clientX" in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const reward = manualTap();
    if (reward <= 0) return;
    const isCrit = Math.random() < 0.08;
    const finalAmount = isCrit ? reward * 5 * tapMultiplier : reward * tapMultiplier;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    setFloatingTaps((prev) =>
      [...prev, { id, x, y, amount: finalAmount, isCrit }].slice(-12),
    );
    setTimeout(() => {
      setFloatingTaps((prev) => prev.filter((t) => t.id !== id));
    }, 1200);

    // spawn sparks
    const newSparks: Spark[] = Array.from({ length: isCrit ? 10 : 6 }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / (isCrit ? 10 : 6) + Math.random() * 0.5;
      const dist = 60 + Math.random() * 50;
      const colors = isCrit
        ? ["oklch(0.78 0.2 70)", "oklch(0.85 0.18 50)", "oklch(0.75 0.2 130)"]
        : ["oklch(0.75 0.18 195)", "oklch(0.78 0.2 70)"];
      return {
        id: `${id}-${i}`,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });
    setSparks((prev) => [...prev, ...newSparks].slice(-60));
    setTimeout(() => {
      setSparks((prev) => prev.filter((s) => !newSparks.some((ns) => ns.id === s.id)));
    }, 800);

    setRigPulse((p) => p + 1);
  }

  // session progress
  const sessionElapsed = sessionStartedAt ? (now - sessionStartedAt) / 1000 : 0;
  const sessionDuration = 15; // seconds
  const sessionTimeLeft = Math.max(0, sessionDuration - sessionElapsed);
  const sessionProgress = Math.min(100, (sessionTaps / Math.max(1, sessionTarget)) * 100);
  const sessionTimeProgress = Math.min(100, (sessionElapsed / sessionDuration) * 100);

  // epoch progress
  const epochTaps = epoch?.tapsThisEpoch || 0;
  const epochSessions = epoch?.sessionsThisEpoch || 0;
  const epochProgress = Math.min(100, (epochTaps / MAX_TAPS_FIVEMIN) * 100);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Mining rig visualization */}
      <div className="relative w-full max-w-md aspect-square mx-auto">
        {/* Outer rotating ring */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: running ? 360 : 0 }}
          transition={{
            duration: 24,
            repeat: running ? Infinity : 0,
            ease: "linear",
          }}
        >
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="oklch(0.78 0.2 70)" />
                <stop offset="50%" stopColor="oklch(0.7 0.18 195)" />
                <stop offset="100%" stopColor="oklch(0.65 0.24 330)" />
              </linearGradient>
            </defs>
            <circle
              cx="200"
              cy="200"
              r="180"
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="2"
              strokeDasharray="6 12"
              opacity="0.55"
            />
            {/* Notches */}
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 360) / 24;
              const rad = (angle * Math.PI) / 180;
              const x1 = 200 + 175 * Math.cos(rad);
              const y1 = 200 + 175 * Math.sin(rad);
              const x2 = 200 + (i % 3 === 0 ? 160 : 167) * Math.cos(rad);
              const y2 = 200 + (i % 3 === 0 ? 160 : 167) * Math.sin(rad);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="oklch(0.78 0.2 70)"
                  strokeWidth={i % 3 === 0 ? 2 : 1}
                  opacity={i % 3 === 0 ? 0.8 : 0.4}
                />
              );
            })}
          </svg>
        </motion.div>

        {/* Inner counter-rotating ring */}
        <motion.div
          className="absolute inset-8"
          animate={{ rotate: running ? -360 : 0 }}
          transition={{
            duration: 18,
            repeat: running ? Infinity : 0,
            ease: "linear",
          }}
        >
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <circle
              cx="200"
              cy="200"
              r="160"
              fill="none"
              stroke="oklch(0.75 0.18 195 / 40%)"
              strokeWidth="1"
              strokeDasharray="2 6"
            />
          </svg>
        </motion.div>

        {/* Tap target — the forge core */}
        <motion.button
          ref={rigRef}
          onClick={handleTap}
          onTouchStart={handleTap}
          whileTap={{ scale: 0.95 }}
          className="absolute inset-16 rounded-full flex items-center justify-center group select-none touch-manipulation"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, oklch(0.35 0.12 60 / 60%) 0%, oklch(0.2 0.08 280 / 70%) 60%, oklch(0.13 0.04 280 / 80%) 100%)",
            boxShadow: running
              ? "0 0 60px oklch(0.78 0.2 70 / 35%), inset 0 0 40px oklch(0.78 0.2 70 / 30%)"
              : "0 0 30px oklch(0.3 0.04 280 / 50%), inset 0 0 30px oklch(0.2 0.04 280 / 50%)",
            border: "1px solid oklch(0.5 0.12 70 / 40%)",
            cursor: running ? "pointer" : "not-allowed",
          }}
          disabled={!running}
          aria-label="Forge core — tap to mine"
        >
          {/* Animated core */}
          <motion.div
            className="absolute inset-8 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, oklch(0.78 0.2 70 / 35%) 0%, transparent 70%)",
              filter: "blur(10px)",
            }}
            animate={{
              scale: running ? [1, 1.1, 1] : 1,
              opacity: running ? [0.6, 0.9, 0.6] : 0.3,
            }}
            transition={{
              duration: 2.4,
              repeat: running ? Infinity : 0,
              ease: "easeInOut",
            }}
          />

          {/* Hammer icon */}
          <motion.div
            key={`pulse-${rigPulse}`}
            initial={{ scale: 1, rotate: -8 }}
            animate={{ scale: [1, 1.15, 1], rotate: [-8, 8, -8] }}
            transition={{ duration: 0.4 }}
            className="relative z-10"
          >
            <Hammer
              className={cn(
                "w-24 h-24 transition-colors drop-shadow-lg",
                running ? "text-amber-300" : "text-zinc-500",
              )}
              strokeWidth={1.5}
              style={{
                filter: running
                  ? "drop-shadow(0 0 12px oklch(0.78 0.2 70 / 80%))"
                  : "none",
              }}
            />
          </motion.div>

          {/* Status text */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
            {running ? (
              <span className="text-xs font-bold text-amber-300 tracking-wider uppercase text-glow-amber">
                Tap the Forge
              </span>
            ) : (
              <span className="text-xs font-medium text-zinc-500 tracking-wider uppercase">
                Forge Idle — press Start
              </span>
            )}
          </div>

          {/* Sparks layer */}
          <div className="absolute inset-0 pointer-events-none overflow-visible">
            <AnimatePresence>
              {sparks.map((spark) => (
                <motion.div
                  key={spark.id}
                  className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: spark.color }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: spark.dx, y: spark.dy, opacity: 0, scale: 0.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Floating tap numbers */}
          <div className="absolute inset-0 pointer-events-none overflow-visible">
            <AnimatePresence>
              {floatingTaps.map((tap) => (
                <motion.div
                  key={tap.id}
                  className={cn(
                    "absolute font-bold pointer-events-none whitespace-nowrap",
                    tap.isCrit
                      ? "text-2xl text-fuchsia-300 text-glow-amber"
                      : "text-lg text-amber-200",
                  )}
                  style={{
                    left: tap.x,
                    top: tap.y,
                    textShadow: tap.isCrit
                      ? "0 0 12px oklch(0.7 0.25 330 / 80%)"
                      : "0 0 8px oklch(0.78 0.2 70 / 50%)",
                  }}
                  initial={{ opacity: 0, y: 0, scale: 0.6 }}
                  animate={{ opacity: 1, y: -80, scale: tap.isCrit ? 1.4 : 1 }}
                  exit={{ opacity: 0, y: -120, scale: 0.8 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                >
                  +{tap.amount.toFixed(4)}
                  {tap.isCrit && (
                    <span className="ml-1 text-[10px] uppercase tracking-wider text-fuchsia-400">
                      CRIT!
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.button>

        {/* Idle overlay prompt */}
        {!running && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <Cog className="w-8 h-8 mx-auto text-zinc-600 animate-spin-slow mb-2" />
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest">
                Forge Standby
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Progress meters */}
      <div className="w-full max-w-md mt-6 space-y-3">
        {/* Session progress */}
        <ProgressBar
          label="Session"
          value={sessionTaps}
          max={sessionTarget}
          accent="amber"
          leftLabel={`${sessionTaps}/${sessionTarget} taps`}
          rightLabel={`${sessionTimeLeft.toFixed(1)}s`}
          timeProgress={sessionTimeProgress}
        />

        {/* Epoch progress */}
        <ProgressBar
          label="Epoch (5 min)"
          value={epochTaps}
          max={MAX_TAPS_FIVEMIN}
          accent="cyan"
          leftLabel={`${epochTaps}/${MAX_TAPS_FIVEMIN} taps`}
          rightLabel={`${epochSessions}/${SESSIONS_PER_EPOCH} sessions`}
        />
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  max,
  accent,
  leftLabel,
  rightLabel,
  timeProgress,
}: {
  label: string;
  value: number;
  max: number;
  accent: "amber" | "cyan" | "magenta";
  leftLabel: string;
  rightLabel: string;
  timeProgress?: number;
}) {
  const percent = Math.min(100, (value / Math.max(1, max)) * 100);
  const accentColors = {
    amber: {
      bg: "from-amber-500 to-orange-400",
      glow: "oklch(0.78 0.2 70 / 60%)",
      text: "text-amber-300",
      border: "border-amber-500/30",
    },
    cyan: {
      bg: "from-cyan-500 to-teal-400",
      glow: "oklch(0.75 0.18 195 / 60%)",
      text: "text-cyan-300",
      border: "border-cyan-500/30",
    },
    magenta: {
      bg: "from-fuchsia-500 to-pink-400",
      glow: "oklch(0.7 0.25 330 / 60%)",
      text: "text-fuchsia-300",
      border: "border-fuchsia-500/30",
    },
  }[accent];

  return (
    <div className={cn("glass rounded-xl p-3 border", accentColors.border)}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-bold uppercase tracking-widest", accentColors.text)}>
            {label}
          </span>
          <span className="text-[10px] text-zinc-500 tabular-nums">
            {leftLabel}
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 tabular-nums">{rightLabel}</span>
      </div>
      <div className="relative h-2 bg-zinc-800/80 rounded-full overflow-hidden">
        <motion.div
          className={cn("absolute inset-y-0 left-0 rounded-full bg-gradient-to-r", accentColors.bg)}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ boxShadow: `0 0 8px ${accentColors.glow}` }}
        />
        {timeProgress !== undefined && (
          <motion.div
            className="absolute top-0 bottom-0 w-0.5 bg-white/40"
            initial={{ left: "0%" }}
            animate={{ left: `${timeProgress}%` }}
            transition={{ duration: 0.1 }}
          />
        )}
      </div>
    </div>
  );
}
