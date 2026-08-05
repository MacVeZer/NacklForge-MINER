"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Lock, Gift } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { RARITY_COLORS, RARITY_LABEL } from "@/lib/game/equipment";
import { usePlayerStore } from "@/store/playerStore";
import { IconResolver } from "@/components/IconResolver";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Achievement } from "@/lib/types";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "mining", label: "Mining" },
  { key: "milestone", label: "Milestones" },
  { key: "collection", label: "Collection" },
  { key: "social", label: "Social" },
] as const;

export function AchievementsView() {
  const [category, setCategory] = useState<typeof CATEGORIES[number]["key"]>("all");
  const unlocked = usePlayerStore((s) => s.unlockedAchievements);
  const claimedAchievements = usePlayerStore((s) => s.claimedQuests); // reuse claimed list
  const unlockAchievement = usePlayerStore((s) => s.unlockAchievement);
  const claimQuest = usePlayerStore((s) => s.claimQuest);
  const addNackl = usePlayerStore((s) => s.addNackl);
  const addXp = usePlayerStore((s) => s.addXp);
  const player = usePlayerStore();

  const list = ACHIEVEMENTS.filter(
    (a) => category === "all" || a.category === category,
  );

  // Compute progress for each achievement based on player metrics
  function getProgress(a: Achievement): number {
    switch (a.metric) {
      case "totalTaps":
        return player.totalTaps;
      case "totalSessions":
        return player.totalSessions;
      case "totalEpochs":
        return player.totalEpochs;
      case "totalRewards":
        return player.totalRewards;
      case "level":
        return player.level;
      case "ownedEquipment":
        return player.ownedEquipment.length;
      case "referrals":
        return player.referrals;
      case "streak":
        return player.streak;
      case "nacklBalance":
        return player.nacklBalance;
      default:
        return 0;
    }
  }

  function handleClaim(a: Achievement) {
    const progress = getProgress(a);
    if (progress < a.goal) return;
    if (claimedAchievements.includes(a.id)) return;
    if (!unlocked.includes(a.id)) unlockAchievement(a.id);
    claimQuest(a.id);
    addNackl(a.reward.nackl);
    if (a.reward.xp > 0) addXp(a.reward.xp);
    toast.success(`Achievement: ${a.title}`, {
      description: `+${a.reward.nackl} NACKL`,
    });
  }

  const totalUnlocked = unlocked.length;
  const totalAchievements = ACHIEVEMENTS.length;
  const overallPercent = (totalUnlocked / totalAchievements) * 100;

  return (
    <div className="px-3 pt-2 pb-32 space-y-4">
      <div>
        <h2 className="text-xl font-bold gradient-text-amber">Achievements</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Unlock badges by reaching milestones. Each grants NACKL rewards.
        </p>
      </div>

      {/* Overall progress */}
      <div className="glass-strong rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">
            Completion
          </span>
          <span className="text-sm font-bold text-amber-300 tabular-nums">
            {totalUnlocked}/{totalAchievements}
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-fuchsia-500 to-cyan-500"
            initial={{ width: 0 }}
            animate={{ width: `${overallPercent}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
        <div className="text-[10px] text-zinc-500 mt-1.5 text-right">
          {overallPercent.toFixed(1)}%
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-3 px-3">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
              category === c.key
                ? "bg-amber-500/15 text-amber-200 border border-amber-400/30"
                : "glass text-zinc-400 border border-transparent hover:text-zinc-200",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2">
        {list.map((a, idx) => {
          const progress = getProgress(a);
          const isUnlocked = progress >= a.goal;
          const isClaimed = claimedAchievements.includes(a.id);
          const colors = RARITY_COLORS[a.rarity];
          const percent = Math.min(100, (progress / a.goal) * 100);

          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              className={cn(
                "relative glass rounded-2xl p-3 border flex flex-col items-center text-center",
                colors.border,
                !isUnlocked && "opacity-60",
              )}
            >
              <div
                className={cn(
                  "relative w-14 h-14 rounded-xl flex items-center justify-center mb-2",
                  colors.bg,
                  isUnlocked && colors.glow,
                )}
              >
                <IconResolver
                  name={a.icon}
                  className={cn(
                    "w-7 h-7",
                    isUnlocked ? colors.text : "text-zinc-600",
                  )}
                  strokeWidth={1.5}
                />
                {!isUnlocked && (
                  <div className="absolute inset-0 rounded-xl bg-zinc-950/60 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-zinc-500" />
                  </div>
                )}
              </div>
              <span className={cn("text-xs font-bold leading-tight", colors.text)}>
                {a.title}
              </span>
              <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{a.description}</p>
              <div className="mt-2 w-full">
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", colors.bg.replace("/10", "/40"))}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <div className="text-[9px] text-zinc-500 mt-1 tabular-nums">
                  {Math.min(progress, a.goal).toLocaleString()} / {a.goal.toLocaleString()}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-bold">
                <Gift className="w-3 h-3 text-amber-300" />
                <span className="text-amber-300">{a.reward.nackl.toLocaleString()}</span>
              </div>
              {isUnlocked && !isClaimed && (
                <button
                  onClick={() => handleClaim(a)}
                  className="mt-2 w-full text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg bg-lime-500/20 text-lime-200 border border-lime-400/40 hover:bg-lime-500/30 transition-colors"
                >
                  Claim
                </button>
              )}
              {isClaimed && (
                <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  ✓ Claimed
                </div>
              )}
              <span className="absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider opacity-60">
                {RARITY_LABEL[a.rarity]}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
