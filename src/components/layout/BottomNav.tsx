"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Hammer,
  Settings,
  Zap,
  Flame,
  Trophy,
  Award,
  BarChart3,
  Users,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ViewKey } from "@/lib/types";
import { useGameStore } from "@/store/gameStore";
import { usePlayerStore } from "@/store/playerStore";
import { cn } from "@/lib/utils";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: LucideIcon;
  accent: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "forge", label: "Forge", icon: Hammer, accent: "text-amber-300" },
  { key: "equipment", label: "Gear", icon: Settings, accent: "text-cyan-300" },
  { key: "boosters", label: "Boost", icon: Zap, accent: "text-magenta-300" },
  { key: "quests", label: "Quests", icon: Flame, accent: "text-orange-300" },
  { key: "leaderboard", label: "Ranks", icon: Trophy, accent: "text-yellow-300" },
  { key: "achievements", label: "Badges", icon: Award, accent: "text-fuchsia-300" },
  { key: "stats", label: "Stats", icon: BarChart3, accent: "text-cyan-300" },
  { key: "referrals", label: "Friends", icon: Users, accent: "text-lime-300" },
];

export function BottomNav() {
  const view = useGameStore((s) => s.view);
  const setView = useGameStore((s) => s.setView);
  const level = usePlayerStore((s) => s.level);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      <div className="mx-auto max-w-3xl px-2 pb-2 pt-1">
        <div className="glass-strong rounded-2xl px-1.5 py-1.5 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = view === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={cn(
                  "relative flex-1 min-w-[58px] flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all duration-200",
                  isActive ? "bg-white/5" : "hover:bg-white/3",
                )}
                aria-label={item.label}
              >
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-glow"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.78 0.2 70 / 18%) 0%, oklch(0.7 0.18 195 / 12%) 100%)",
                        boxShadow: "inset 0 1px 0 oklch(1 0 0 / 8%)",
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 30,
                      }}
                    />
                  )}
                </AnimatePresence>
                <Icon
                  className={cn(
                    "relative w-5 h-5 transition-colors",
                    isActive ? item.accent : "text-zinc-400",
                  )}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span
                  className={cn(
                    "relative text-[10px] font-medium tracking-wide transition-colors",
                    isActive ? "text-zinc-100" : "text-zinc-500",
                  )}
                >
                  {item.label}
                </span>
                {item.key === "forge" && level > 0 && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export { NAV_ITEMS };
export type { NavItem };

// Sparkles icon for completeness (used elsewhere if needed)
export const SparklesIcon = Sparkles;
