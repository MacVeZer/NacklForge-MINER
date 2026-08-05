"use client";

import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Award, Flame } from "lucide-react";
import { MiningRig } from "./MiningRig";
import { MiningControls } from "./MiningControls";
import { LiveMiningLog } from "./LiveMiningLog";
import { usePlayerStore } from "@/store/playerStore";
import { useMiningStore } from "@/store/miningStore";
import { useGameStore } from "@/store/gameStore";
import { useEffect } from "react";

export function ForgeView() {
  const totalTaps = usePlayerStore((s) => s.totalTaps);
  const totalRewards = usePlayerStore((s) => s.totalRewards);
  const totalMined = useMiningStore((s) => s.totalMined);
  const streak = usePlayerStore((s) => s.streak);

  const logs = useMiningStore((s) => s.logs);
  const recordSession = usePlayerStore((s) => s.recordSession);
  const gameSession = useGameStore((s) => s.recordSession);
  const computeQuests = useGameStore((s) => s.computeQuestState);
  const gameTap = useGameStore((s) => s.recordTap);

  // Track session completions from log
  useEffect(() => {
    const last = logs[0];
    if (!last) return;
    if (last.type === "session_completed" && last.data?.actualTaps !== undefined) {
      recordSession(last.data.actualTaps as number);
      gameSession();
    }
  }, [logs, recordSession, gameSession]);

  // Recompute quests periodically when totalTaps changes
  useEffect(() => {
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
    gameTap(); // count any engine tap as game tap too
  }, [totalTaps, computeQuests, gameTap]);

  return (
    <div className="px-3 pt-2 pb-32 space-y-4">
      {/* Hero stats */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-2 max-w-md mx-auto w-full"
      >
        <StatCard
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Total Taps"
          value={totalTaps.toLocaleString()}
          accent="text-amber-300"
        />
        <StatCard
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          label="Total Mined"
          value={totalMined.toFixed(2)}
          accent="text-cyan-300"
        />
        <StatCard
          icon={<Flame className="w-3.5 h-3.5" />}
          label="Streak"
          value={`${streak}d`}
          accent="text-orange-300"
        />
      </motion.div>

      <MiningRig />

      <MiningControls />

      <LiveMiningLog />

      {/* Footer tip */}
      <div className="text-center text-[10px] text-zinc-600 max-w-md mx-auto">
        <Award className="w-3 h-3 inline mr-1" />
        Tap the glowing forge core while mining to land critical hits. Upgrade your gear to multiply every tap.
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="glass rounded-xl p-2.5 flex flex-col items-center justify-center gap-0.5">
      <div className={`flex items-center gap-1 ${accent}`}>{icon}</div>
      <div className="text-base font-bold text-zinc-100 tabular-nums">{value}</div>
      <div className="text-[9px] text-zinc-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
