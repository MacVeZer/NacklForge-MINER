"use client";

import { motion } from "framer-motion";
import { Flame, Zap, Coins, Activity } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { useMiningStore } from "@/store/miningStore";
import { cn } from "@/lib/utils";

export function Header() {
  const name = usePlayerStore((s) => s.name);
  const level = usePlayerStore((s) => s.level);
  const xp = usePlayerStore((s) => s.xp);
  const xpToNext = usePlayerStore((s) => s.xpToNext);
  const nacklBalance = usePlayerStore((s) => s.nacklBalance);
  const streak = usePlayerStore((s) => s.streak);

  const running = useMiningStore((s) => s.running);
  const mode = useMiningStore((s) => s.mode);
  const pendingReward = useMiningStore((s) => s.pendingReward);

  const xpPercent = Math.min(100, (xp / Math.max(1, xpToNext)) * 100);

  return (
    <header className="sticky top-0 z-30 safe-top">
      <div className="mx-auto max-w-3xl px-3 pt-3 pb-2">
        <div className="glass-strong rounded-2xl px-3 py-2.5 flex items-center gap-3">
          {/* Avatar / level ring */}
          <div className="relative w-11 h-11 flex-shrink-0">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
              <circle
                cx="22"
                cy="22"
                r="19"
                fill="none"
                stroke="oklch(0.3 0.03 280)"
                strokeWidth="3"
              />
              <motion.circle
                cx="22"
                cy="22"
                r="19"
                fill="none"
                stroke="oklch(0.78 0.2 70)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 19}
                initial={{ strokeDashoffset: 2 * Math.PI * 19 }}
                animate={{
                  strokeDashoffset: 2 * Math.PI * 19 * (1 - xpPercent / 100),
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{ filter: "drop-shadow(0 0 4px oklch(0.78 0.2 70 / 50%))" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-amber-300">
                {level}
              </span>
            </div>
          </div>

          {/* Name + XP */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-100 truncate">
                {name || "Forge Guest"}
              </span>
              {streak > 0 && (
                <div className="flex items-center gap-0.5 text-[10px] text-orange-300">
                  <Flame className="w-3 h-3" />
                  <span className="font-medium">{streak}</span>
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, oklch(0.78 0.2 70) 0%, oklch(0.85 0.18 50) 100%)",
                    boxShadow: "0 0 8px oklch(0.78 0.2 70 / 60%)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercent}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <span className="text-[10px] text-zinc-500 tabular-nums">
                {xp}/{xpToNext}
              </span>
            </div>
          </div>

          {/* Balance */}
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-sm font-bold text-amber-200 tabular-nums">
                {nacklBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 font-medium tracking-wider uppercase">
              NACKL
            </span>
          </div>
        </div>

        {/* Status row */}
        <div className="mt-2 flex items-center gap-2 px-1">
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold tracking-wide",
              running
                ? "bg-amber-500/15 text-amber-300 border border-amber-400/30"
                : "bg-zinc-800/60 text-zinc-400 border border-zinc-700/40",
            )}
          >
            <span className="relative flex w-1.5 h-1.5">
              {running && (
                <span className="absolute inline-flex w-full h-full rounded-full bg-amber-400 opacity-75 animate-ring-ping" />
              )}
              <span
                className={cn(
                  "relative inline-flex rounded-full w-1.5 h-1.5",
                  running ? "bg-amber-400" : "bg-zinc-500",
                )}
              />
            </span>
            {running ? "FORGE ACTIVE" : "IDLE"}
          </div>

          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700/40">
            <Activity className="w-3 h-3" />
            {mode === "live" ? "LIVE CHAIN" : "SIM"}
          </div>

          {pendingReward > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-lime-500/15 text-lime-300 border border-lime-400/30">
              <Zap className="w-3 h-3" />
              +{pendingReward.toFixed(4)}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
