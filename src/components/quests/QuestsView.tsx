"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Check, Lock, Gift, Calendar, CalendarDays, Sparkles } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { usePlayerStore } from "@/store/playerStore";
import { IconResolver } from "@/components/IconResolver";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Quest } from "@/lib/types";

const ACCENT_COLORS = {
  amber: "text-amber-300 border-amber-400/30 bg-amber-500/10",
  cyan: "text-cyan-300 border-cyan-400/30 bg-cyan-500/10",
  magenta: "text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-500/10",
  lime: "text-lime-300 border-lime-400/30 bg-lime-500/10",
  violet: "text-violet-300 border-violet-400/30 bg-violet-500/10",
};

export function QuestsView() {
  const [tab, setTab] = useState<"daily" | "weekly" | "one-time">("daily");
  const dailyQuests = useGameStore((s) => s.dailyQuests);
  const weeklyQuests = useGameStore((s) => s.weeklyQuests);
  const oneTimeQuests = useGameStore((s) => s.oneTimeQuests);
  const claimedQuests = usePlayerStore((s) => s.claimedQuests);
  const claimQuest = usePlayerStore((s) => s.claimQuest);
  const addNackl = usePlayerStore((s) => s.addNackl);
  const addXp = usePlayerStore((s) => s.addXp);

  const list = tab === "daily" ? dailyQuests : tab === "weekly" ? weeklyQuests : oneTimeQuests;

  function handleClaim(q: Quest) {
    if (!q.completed) return;
    if (claimedQuests.includes(q.id)) return;
    claimQuest(q.id);
    addNackl(q.reward.nackl);
    if (q.reward.xp > 0) addXp(q.reward.xp);
    toast.success(`Claimed ${q.reward.nackl} NACKL`, {
      description: q.title,
    });
  }

  const tabConfig = [
    { key: "daily" as const, label: "Daily", icon: Calendar },
    { key: "weekly" as const, label: "Weekly", icon: CalendarDays },
    { key: "one-time" as const, label: "Milestones", icon: Sparkles },
  ];

  return (
    <div className="px-3 pt-2 pb-32 space-y-4">
      <div>
        <h2 className="text-xl font-bold gradient-text-amber">Quest Board</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Complete objectives to earn NACKL and XP. New quests daily.
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 p-1 glass rounded-xl">
        {tabConfig.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                tab === t.key
                  ? "bg-amber-500/15 text-amber-200"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Quest list */}
      <div className="space-y-2">
        {list.map((q, idx) => {
          const claimed = claimedQuests.includes(q.id);
          const progress = Math.min(q.progress, q.goal);
          const percent = (progress / Math.max(1, q.goal)) * 100;
          const accentClass = ACCENT_COLORS[q.accent];

          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "glass rounded-2xl p-3 border flex items-start gap-3",
                accentClass,
                claimed && "opacity-50",
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                <IconResolver name={q.icon} className={cn("w-5 h-5", accentClass.split(" ")[0])} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-zinc-100">{q.title}</span>
                  <div className="flex items-center gap-1 text-[10px] font-bold">
                    <Gift className="w-3 h-3 text-amber-300" />
                    <span className="text-amber-300">{q.reward.nackl}</span>
                    {q.reward.xp > 0 && <span className="text-cyan-300 ml-1">+{q.reward.xp}xp</span>}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">{q.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 tabular-nums">
                    {progress}/{q.goal}
                  </span>
                  <button
                    onClick={() => handleClaim(q)}
                    disabled={!q.completed || claimed}
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-colors",
                      claimed
                        ? "bg-zinc-800/40 text-zinc-600 border-zinc-700/30 cursor-not-allowed"
                        : q.completed
                          ? "bg-lime-500/20 text-lime-200 border-lime-400/40 hover:bg-lime-500/30"
                          : "bg-zinc-800/40 text-zinc-600 border-zinc-700/30 cursor-not-allowed",
                    )}
                  >
                    {claimed ? (
                      <Check className="w-3 h-3" />
                    ) : q.completed ? (
                      "Claim"
                    ) : (
                      <Lock className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
