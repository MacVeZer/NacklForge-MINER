"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, Clock, Target, Award, Zap, Flame } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { useMiningStore } from "@/store/miningStore";
import { EQUIPMENT, RARITY_COLORS, RARITY_LABEL } from "@/lib/game/equipment";
import { IconResolver } from "@/components/IconResolver";
import { cn } from "@/lib/utils";

export function StatsView() {
  const player = usePlayerStore();
  const totalMined = useMiningStore((s) => s.totalMined);
  const pendingReward = useMiningStore((s) => s.pendingReward);

  // Build chart data
  const tapsByHour = player.stats.tapsByHour.map((taps, hour) => ({
    hour: `${hour}:00`,
    taps,
  }));

  const tapsByDay = player.stats.tapsByDay.slice(-14).map((d) => ({
    date: d.date.slice(5),
    taps: d.taps,
    rewards: Number(d.rewards.toFixed(2)),
  }));

  // Equipment rarity distribution
  const rarityDist = ["common", "rare", "epic", "legendary", "mythic"].map((rarity) => ({
    name: RARITY_LABEL[rarity as keyof typeof RARITY_LABEL],
    value: player.ownedEquipment.filter((id) => EQUIPMENT.find((e) => e.id === id)?.rarity === rarity).length,
    color:
      rarity === "common"
        ? "oklch(0.7 0.02 280)"
        : rarity === "rare"
          ? "oklch(0.75 0.18 195)"
          : rarity === "epic"
            ? "oklch(0.7 0.25 330)"
            : rarity === "legendary"
              ? "oklch(0.78 0.2 70)"
              : "oklch(0.75 0.2 130)",
  })).filter((d) => d.value > 0);

  const totalSessions = player.totalSessions || 1;
  const avgTaps = player.stats.averageSessionTaps.toFixed(1);
  const playTimeHours = (player.stats.totalPlayTimeMs / 3600_000).toFixed(2);

  return (
    <div className="px-3 pt-2 pb-32 space-y-4">
      <div>
        <h2 className="text-xl font-bold gradient-text-amber">Forge Analytics</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Deep dive into your mining performance over time.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2">
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Total Mined" value={totalMined.toFixed(2)} suffix="NACKL" accent="text-amber-300" />
        <KpiCard icon={<Zap className="w-4 h-4" />} label="Pending" value={pendingReward.toFixed(4)} suffix="NACKL" accent="text-lime-300" />
        <KpiCard icon={<Target className="w-4 h-4" />} label="Avg / Session" value={avgTaps} suffix="taps" accent="text-cyan-300" />
        <KpiCard icon={<Clock className="w-4 h-4" />} label="Play Time" value={playTimeHours} suffix="hours" accent="text-fuchsia-300" />
        <KpiCard icon={<Award className="w-4 h-4" />} label="Best Session" value={String(player.stats.bestSessionTaps)} suffix="taps" accent="text-amber-300" />
        <KpiCard icon={<Flame className="w-4 h-4" />} label="Streak" value={String(player.streak)} suffix="days" accent="text-orange-300" />
      </div>

      {/* Taps by day */}
      <div className="glass rounded-2xl p-3">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
          Taps — Last 14 days
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tapsByDay}>
              <defs>
                <linearGradient id="tapsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.2 70 / 50%)" />
                  <stop offset="100%" stopColor="oklch(0.78 0.2 70 / 0%)" />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="oklch(0.5 0.02 280)" tick={{ fontSize: 9 }} />
              <YAxis stroke="oklch(0.5 0.02 280)" tick={{ fontSize: 9 }} width={28} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.16 0.025 280)",
                  border: "1px solid oklch(0.4 0.05 280)",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                labelStyle={{ color: "oklch(0.97 0.01 60)" }}
              />
              <Area
                type="monotone"
                dataKey="taps"
                stroke="oklch(0.78 0.2 70)"
                strokeWidth={2}
                fill="url(#tapsGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Taps by hour */}
      <div className="glass rounded-2xl p-3">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
          Taps — By hour of day
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tapsByHour}>
              <XAxis dataKey="hour" stroke="oklch(0.5 0.02 280)" tick={{ fontSize: 8 }} interval={3} />
              <YAxis stroke="oklch(0.5 0.02 280)" tick={{ fontSize: 9 }} width={28} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.16 0.025 280)",
                  border: "1px solid oklch(0.4 0.05 280)",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                labelStyle={{ color: "oklch(0.97 0.01 60)" }}
              />
              <Bar dataKey="taps" fill="oklch(0.75 0.18 195)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Equipment rarity pie */}
      {rarityDist.length > 0 && (
        <div className="glass rounded-2xl p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
            Equipment by rarity
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rarityDist}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={28}
                    outerRadius={56}
                    paddingAngle={2}
                  >
                    {rarityDist.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.16 0.025 280)",
                      border: "1px solid oklch(0.4 0.05 280)",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              {rarityDist.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-zinc-400 flex-1">{d.name}</span>
                  <span className="text-zinc-200 font-bold tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Session history */}
      <div className="glass rounded-2xl p-3">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
          Session summary
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-amber-300 tabular-nums">
              {player.totalSessions}
            </div>
            <div className="text-[9px] uppercase text-zinc-500 tracking-wider">Total</div>
          </div>
          <div>
            <div className="text-lg font-bold text-cyan-300 tabular-nums">
              {player.totalEpochs}
            </div>
            <div className="text-[9px] uppercase text-zinc-500 tracking-wider">Epochs</div>
          </div>
          <div>
            <div className="text-lg font-bold text-fuchsia-300 tabular-nums">
              {player.unlockedAchievements.length}
            </div>
            <div className="text-[9px] uppercase text-zinc-500 tracking-wider">Badges</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  suffix,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix: string;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-3"
    >
      <div className={cn("flex items-center gap-1.5 mb-1", accent)}>
        {icon}
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-xl font-bold tabular-nums", accent)}>{value}</span>
        <span className="text-[9px] text-zinc-500 uppercase">{suffix}</span>
      </div>
    </motion.div>
  );
}
