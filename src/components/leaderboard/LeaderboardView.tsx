"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { Trophy, Crown, Medal, Flame } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { cn } from "@/lib/utils";

interface MockEntry {
  name: string;
  taps: number;
  rewards: number;
  level: number;
  country: string;
}

// Deterministic mock leaderboard (seeded once, refreshed daily)
function makeLeaderboard(playerName: string, playerTaps: number, playerLevel: number): MockEntry[] {
  const names = [
    "ForgeKing", "NacklQueen", "IronMiner", "QuantumSmith", "PlasmaDriller",
    "CryoForge", "SolarSmith", "SingularityX", "TurboTap", "GoldenForge",
    "NeonHammer", "VoidWalker", "CosmicRig", "StellarMine", "EchoForge",
    "NovaSmith", "AstroTap", "PixelForge", "ByteMiner", "CyberSmith",
    "FluxCapacitor", "RuneMaster", "ChaosForge", "OrderMiner", "BinarySmith",
    "HexForge", "OctoMiner", "TurboForge", "MegaSmith", "UltraTap",
    "TitanForge", "OmegaMiner", "ApexSmith", "PrimeTap", "EliteForge",
  ];
  const countries = ["🇷🇺", "🇺🇸", "🇨🇳", "🇯🇵", "🇰🇷", "🇩🇪", "🇫🇷", "🇧🇷", "🇮🇳", "🇬🇧", "🇨🇦", "🇦🇺"];
  const day = Math.floor(Date.now() / 86400_000);
  const seeded = names.map((name, i) => {
    const seed = (day * 9301 + i * 49297) % 233280;
    const rand = seed / 233280;
    const taps = Math.floor(50000 * (1 - i / 50) + rand * 8000 + 5000);
    return {
      name,
      taps,
      rewards: taps * 0.0072,
      level: Math.floor(5 + (1 - i / 50) * 45 + rand * 5),
      country: countries[i % countries.length],
    };
  });
  const player: MockEntry = {
    name: playerName || "You",
    taps: playerTaps,
    rewards: playerTaps * 0.0072,
    level: playerLevel,
    country: "🏴",
  };
  const combined = [...seeded, player].sort((a, b) => b.taps - a.taps);
  return combined;
}

export function LeaderboardView() {
  const [scope, setScope] = useState<"global" | "weekly" | "friends">("global");
  const name = usePlayerStore((s) => s.name);
  const totalTaps = usePlayerStore((s) => s.totalTaps);
  const level = usePlayerStore((s) => s.level);

  const entries = useMemo(
    () => makeLeaderboard(name || "You", totalTaps, level),
    [name, totalTaps, level],
  );

  const playerRank = entries.findIndex((e) => e.name === (name || "You")) + 1;
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3, 30);

  return (
    <div className="px-3 pt-2 pb-32 space-y-4">
      <div>
        <h2 className="text-xl font-bold gradient-text-amber">Forge Rankings</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Compete with miners worldwide. Top earners get exclusive cosmetics.
        </p>
      </div>

      {/* Scope selector */}
      <div className="flex gap-1 p-1 glass rounded-xl">
        {(["global", "weekly", "friends"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
              scope === s
                ? "bg-amber-500/15 text-amber-200"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Player rank card */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-4 border-amber-400/30"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center font-bold text-zinc-950 text-lg">
              {playerRank}
            </div>
            <div className="absolute -top-1 -right-1 bg-zinc-900 border border-amber-400/40 rounded-full px-1.5 text-[9px] font-bold text-amber-300">
              YOU
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-zinc-100">{name || "You"}</span>
              <Flame className="w-3 h-3 text-orange-300" />
              <span className="text-[10px] text-orange-300">Lv.{level}</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              {totalTaps.toLocaleString()} taps · {(totalTaps * 0.0072).toFixed(2)} NACKL mined
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Rank</div>
            <div className="text-lg font-bold text-amber-300">#{playerRank}</div>
          </div>
        </div>
      </motion.div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-2 items-end">
        {top3.map((entry, idx) => {
          const place = idx + 1;
          const podiumStyle =
            place === 1
              ? "h-32 from-amber-500/30 to-amber-500/5 border-amber-400/40 text-amber-300"
              : place === 2
                ? "h-28 from-zinc-400/20 to-zinc-400/5 border-zinc-400/30 text-zinc-300"
                : "h-24 from-orange-700/20 to-orange-700/5 border-orange-600/30 text-orange-300";
          const Icon = place === 1 ? Crown : Medal;
          return (
            <motion.div
              key={entry.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "relative rounded-2xl bg-gradient-to-b border flex flex-col items-center justify-end p-3 pt-6",
                podiumStyle,
              )}
            >
              {place === 1 && (
                <Trophy className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 text-amber-300 drop-shadow-[0_0_8px_oklch(0.78_0.2_70/60%)]" />
              )}
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold truncate max-w-full">{entry.name}</span>
              <span className="text-[9px] opacity-70">{entry.country}</span>
              <span className="text-xs font-bold mt-1">{entry.taps.toLocaleString()}</span>
              <span className="text-[9px] opacity-70 uppercase tracking-wider">taps</span>
            </motion.div>
          );
        })}
      </div>

      {/* Rest of leaderboard */}
      <div className="space-y-1">
        {rest.map((entry, idx) => {
          const rank = idx + 4;
          const isPlayer = entry.name === (name || "You");
          return (
            <motion.div
              key={`${entry.name}-${rank}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.02 }}
              className={cn(
                "glass rounded-xl px-3 py-2 flex items-center gap-3",
                isPlayer && "ring-1 ring-amber-400/40",
              )}
            >
              <span className="text-xs font-bold text-zinc-500 tabular-nums w-6">{rank}</span>
              <span className="text-lg">{entry.country}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-zinc-100 truncate">{entry.name}</span>
                  {isPlayer && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                      YOU
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-zinc-500">Lv.{entry.level}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-amber-300 tabular-nums">
                  {entry.taps.toLocaleString()}
                </div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-wider">taps</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
