"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Zap, Clock, Plus } from "lucide-react";
import { BOOSTERS } from "@/lib/game/boosters";
import { usePlayerStore } from "@/store/playerStore";
import { useGameStore } from "@/store/gameStore";
import { IconResolver } from "@/components/IconResolver";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { BoosterDef } from "@/lib/types";

const ACCENT_CLASSES = {
  amber: "text-amber-300 border-amber-400/30 bg-amber-500/10",
  cyan: "text-cyan-300 border-cyan-400/30 bg-cyan-500/10",
  magenta: "text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-500/10",
  lime: "text-lime-300 border-lime-400/30 bg-lime-500/10",
  violet: "text-violet-300 border-violet-400/30 bg-violet-500/10",
};

export function BoostersView() {
  const boosters = usePlayerStore((s) => s.boosters);
  const activeBoosters = usePlayerStore((s) => s.activeBoosters);
  const activateBooster = usePlayerStore((s) => s.activateBooster);
  const addBooster = usePlayerStore((s) => s.addBooster);
  const spendNackl = usePlayerStore((s) => s.spendNackl);
  const nacklBalance = usePlayerStore((s) => s.nacklBalance);
  const tickActiveBoosters = usePlayerStore((s) => s.tickActiveBoosters);
  const recordBoosterActivated = useGameStore((s) => s.recordBoosterActivated);

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      tickActiveBoosters();
    }, 500);
    return () => clearInterval(id);
  }, [tickActiveBoosters]);

  function handleActivate(b: BoosterDef) {
    const owned = boosters[b.id] || 0;
    if (owned <= 0) {
      toast.error(`No ${b.name} in inventory`);
      return;
    }
    activateBooster(b.id, b.durationMs);
    recordBoosterActivated();
    toast.success(`${b.name} activated!`, {
      description: b.description,
    });
  }

  function handleBuy(b: BoosterDef) {
    if (nacklBalance < b.cost) {
      toast.error(`Need ${b.cost.toLocaleString()} NACKL`);
      return;
    }
    const ok = spendNackl(b.cost);
    if (!ok) return;
    addBooster(b.id, 1);
    toast.success(`Bought 1 ${b.name}`);
  }

  return (
    <div className="px-3 pt-2 pb-32 space-y-4">
      <div>
        <h2 className="text-xl font-bold gradient-text-amber">Booster Shelf</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Activate temporary power-ups to supercharge your mining. Stack for insane combos.
        </p>
      </div>

      {/* Active boosters */}
      <AnimatePresence>
        {activeBoosters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-strong rounded-2xl p-3 border-amber-400/30"
          >
            <div className="text-[10px] uppercase tracking-widest text-amber-300 mb-2 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Active Boosters
            </div>
            <div className="space-y-2">
              {activeBoosters.map((ab) => {
                const def = BOOSTERS.find((b) => b.id === ab.id);
                if (!def) return null;
                const elapsed = now - ab.activatedAt;
                const remaining = Math.max(0, def.durationMs - elapsed);
                const percent = (remaining / def.durationMs) * 100;
                const seconds = Math.ceil(remaining / 1000);
                return (
                  <div
                    key={`${ab.id}-${ab.activatedAt}`}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border",
                      ACCENT_CLASSES[def.accent],
                    )}
                  >
                    <IconResolver name={def.icon} className={cn("w-5 h-5", ACCENT_CLASSES[def.accent].split(" ")[0])} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-zinc-100">{def.name}</div>
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
                        <motion.div
                          className={cn("h-full rounded-full", `bg-${def.accent === "magenta" ? "fuchsia" : def.accent === "lime" ? "lime" : def.accent}-500`)}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold tabular-nums text-zinc-300">
                      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booster grid */}
      <div className="grid grid-cols-2 gap-2">
        {BOOSTERS.map((b, idx) => {
          const owned = boosters[b.id] || 0;
          const accentClass = ACCENT_CLASSES[b.accent];
          const isActive = activeBoosters.some((ab) => ab.id === b.id);

          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "relative glass rounded-2xl p-3 border flex flex-col items-center text-center",
                accentClass,
                isActive && "ring-1 ring-amber-400/50",
              )}
            >
              {/* Owned count */}
              {owned > 0 && (
                <span className="absolute top-2 right-2 text-[10px] font-bold bg-zinc-900 border border-zinc-600 rounded-full px-1.5 py-0.5 text-zinc-300">
                  ×{owned}
                </span>
              )}

              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-2", accentClass)}>
                <IconResolver name={b.icon} className={cn("w-6 h-6", accentClass.split(" ")[0])} />
              </div>

              <span className={cn("text-xs font-bold leading-tight", accentClass.split(" ")[0])}>
                {b.name}
              </span>
              <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2 flex-1">
                {b.description}
              </p>

              <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-500">
                <Clock className="w-3 h-3" />
                {Math.floor(b.durationMs / 60000)}m {Math.floor((b.durationMs % 60000) / 1000)}s
              </div>

              {/* Action buttons */}
              <div className="mt-2 w-full space-y-1">
                <button
                  onClick={() => handleActivate(b)}
                  disabled={owned <= 0}
                  className={cn(
                    "w-full text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg border transition-colors",
                    owned > 0
                      ? "bg-amber-500/15 text-amber-200 border-amber-400/30 hover:bg-amber-500/25"
                      : "bg-zinc-800/40 text-zinc-600 border-zinc-700/30 cursor-not-allowed",
                  )}
                >
                  {owned > 0 ? "Activate" : "None owned"}
                </button>
                <button
                  onClick={() => handleBuy(b)}
                  disabled={nacklBalance < b.cost}
                  className={cn(
                    "w-full text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg border transition-colors flex items-center justify-center gap-1",
                    nacklBalance >= b.cost
                      ? "bg-cyan-500/15 text-cyan-200 border-cyan-400/30 hover:bg-cyan-500/25"
                      : "bg-zinc-800/40 text-zinc-600 border-zinc-700/30 cursor-not-allowed",
                  )}
                >
                  <Plus className="w-3 h-3" />
                  Buy {b.cost.toLocaleString()}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
