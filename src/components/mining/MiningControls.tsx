"use client";

import { motion } from "framer-motion";
import { Play, Square, Bot, Zap, Coins } from "lucide-react";
import { useMiningStore } from "@/store/miningStore";
import { usePlayerStore } from "@/store/playerStore";
import { useGameStore } from "@/store/gameStore";
import { cn } from "@/lib/utils";

export function MiningControls() {
  const running = useMiningStore((s) => s.running);
  const starting = useMiningStore((s) => s.starting);
  const cooldown = useMiningStore((s) => s.cooldown);
  const autopilot = useMiningStore((s) => s.autopilot);
  const pendingReward = useMiningStore((s) => s.pendingReward);
  const startNow = useMiningStore((s) => s.startNow);
  const stopNow = useMiningStore((s) => s.stopNow);
  const toggleAutopilot = useMiningStore((s) => s.toggleAutopilot);

  const recordReward = usePlayerStore((s) => s.recordReward);
  const recordSession = usePlayerStore((s) => s.recordSession);
  const recordEpoch = usePlayerStore((s) => s.recordEpoch);
  const recordDayActive = usePlayerStore((s) => s.recordDayActive);

  const gameTap = useGameStore((s) => s.recordTap);
  const gameSession = useGameStore((s) => s.recordSession);
  const gameEpoch = useGameStore((s) => s.recordEpochFilled);
  const computeQuests = useGameStore((s) => s.computeQuestState);

  // wire session/epoch tracking via logs subscription
  // (handled in page-level effect)

  function handleStart() {
    recordDayActive();
    startNow();
  }

  function handleStop() {
    stopNow();
  }

  function handleClaim() {
    if (pendingReward <= 0) return;
    recordReward(pendingReward);
    recordEpoch();
    gameEpoch();
    computeQuests({
      totalTaps: usePlayerStore.getState().totalTaps,
      totalSessions: usePlayerStore.getState().totalSessions,
      totalEpochs: usePlayerStore.getState().totalEpochs,
      level: usePlayerStore.getState().level,
      ownedEquipmentCount: usePlayerStore.getState().ownedEquipment.length,
      referrals: usePlayerStore.getState().referrals,
      streak: usePlayerStore.getState().streak,
      nacklBalance: usePlayerStore.getState().nacklBalance,
    });
  }

  return (
    <div className="w-full max-w-md mx-auto mt-4 grid grid-cols-3 gap-2">
      {/* Start / Stop */}
      {!running ? (
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleStart}
          disabled={starting}
          className={cn(
            "btn-shimmer col-span-2 relative overflow-hidden rounded-2xl py-4 px-4 font-bold transition-all",
            "bg-gradient-to-br from-amber-500 to-orange-500 text-zinc-950",
            "shadow-[0_0_24px_oklch(0.78_0.2_70/40%)]",
            starting && "opacity-70",
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Play className="w-5 h-5 fill-current" />
            <span className="tracking-wider uppercase">
              {starting ? "Starting..." : cooldown ? "Forge Resume" : "Start Forge"}
            </span>
          </div>
        </motion.button>
      ) : (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleStop}
          className={cn(
            "btn-shimmer col-span-2 relative overflow-hidden rounded-2xl py-4 px-4 font-bold transition-all",
            "bg-gradient-to-br from-rose-500 to-red-600 text-white",
            "shadow-[0_0_24px_oklch(0.6_0.24_25/40%)]",
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Square className="w-5 h-5 fill-current" />
            <span className="tracking-wider uppercase">Stop Forge</span>
          </div>
        </motion.button>
      )}

      {/* Autopilot toggle */}
      <button
        onClick={toggleAutopilot}
        className={cn(
          "relative rounded-2xl py-4 px-2 font-bold transition-all border",
          autopilot
            ? "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/50 shadow-[0_0_18px_oklch(0.7_0.25_330/30%)]"
            : "bg-zinc-800/60 text-zinc-400 border-zinc-700/40 hover:bg-zinc-800",
        )}
      >
        <div className="flex flex-col items-center gap-0.5">
          <Bot className="w-5 h-5" />
          <span className="text-[10px] tracking-wider uppercase">Auto</span>
        </div>
      </button>

      {/* Claim reward */}
      <button
        onClick={handleClaim}
        disabled={pendingReward <= 0}
        className={cn(
          "col-span-3 rounded-2xl py-3 px-4 font-bold transition-all border flex items-center justify-center gap-2",
          pendingReward > 0
            ? "bg-gradient-to-r from-lime-500/20 to-emerald-500/20 text-lime-200 border-lime-400/40 hover:from-lime-500/30 hover:to-emerald-500/30"
            : "bg-zinc-800/40 text-zinc-600 border-zinc-700/30 cursor-not-allowed",
        )}
      >
        <Coins className="w-4 h-4" />
        <span className="text-sm tracking-wider uppercase">
          {pendingReward > 0
            ? `Claim ${pendingReward.toFixed(4)} NACKL`
            : "No reward to claim"}
        </span>
        {pendingReward > 0 && (
          <Zap className="w-3.5 h-3.5 text-lime-300 animate-pulse" />
        )}
      </button>
    </div>
  );
}
