import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActiveBooster,
  EquipmentSlot,
  PlayerState,
} from "@/lib/types";
import { STARTER_EQUIPMENT_IDS } from "@/lib/game/equipment";
import { xpForLevel } from "@/lib/mining/constants";

interface PlayerStore extends PlayerState {
  // hydration helper
  _hasHydrated: boolean;
  setHydrated: () => void;

  // account
  connect: (name: string) => void;
  disconnect: () => void;

  // economy
  addNackl: (amount: number) => void;
  spendNackl: (amount: number) => boolean;
  addXp: (amount: number) => void;

  // stats tracking
  recordTap: () => void;
  recordSession: (taps: number) => void;
  recordEpoch: () => void;
  recordReward: (amount: number) => void;
  recordDayActive: () => void;
  recordEquipmentPurchase: (cost: number) => void;
  recordBoosterActivation: () => void;
  recordShare: () => void;
  recordReferral: () => void;

  // equipment
  ownEquipment: (id: string) => void;
  equip: (slot: EquipmentSlot, id: string) => void;

  // achievements / quests
  unlockAchievement: (id: string) => void;
  completeQuest: (id: string) => void;
  claimQuest: (id: string) => void;

  // boosters
  addBooster: (id: string, count?: number) => void;
  activateBooster: (id: string, durationMs: number) => void;
  tickActiveBoosters: () => void;

  // refs
  setReferralCode: (code: string) => void;

  reset: () => void;
}

const HOURS = 24;

function makeInitialPlayer(): PlayerState {
  const tapsByHour = new Array(HOURS).fill(0);
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: null,
    connectedAt: null,
    level: 1,
    xp: 0,
    xpToNext: xpForLevel(1),
    nacklBalance: 0,
    totalTaps: 0,
    totalSessions: 0,
    totalEpochs: 0,
    totalRewards: 0,
    streak: 1,
    lastActiveDay: today,
    ownedEquipment: [...STARTER_EQUIPMENT_IDS],
    equipped: {
      rig: "rig-starter",
      cooling: "cool-fan",
      power: "pow-grid",
      amplifier: null,
      booster: null,
    },
    unlockedAchievements: [],
    completedQuests: [],
    claimedQuests: [],
    referralCode: "",
    referrals: 0,
    boosters: { turbo: 1, "double-reward": 1 }, // starter kit
    activeBoosters: [],
    stats: {
      bestSessionTaps: 0,
      bestEpochTaps: 0,
      averageSessionTaps: 0,
      totalPlayTimeMs: 0,
      peakHour: 0,
      tapsByHour,
      tapsByDay: [{ date: today, taps: 0, rewards: 0 }],
    },
  };
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      ...makeInitialPlayer(),
      _hasHydrated: false,
      setHydrated: () => set({ _hasHydrated: true }),

      connect: (name) => {
        const code =
          get().referralCode ||
          `NACKL-${name.toUpperCase().slice(0, 4)}-${Math.random()
            .toString(36)
            .slice(2, 6)
            .toUpperCase()}`;
        set({
          name,
          connectedAt: Date.now(),
          referralCode: code,
          lastActiveDay: todayKey(),
          streak: 1,
        });
      },

      disconnect: () => {
        set({ name: null, connectedAt: null });
      },

      addNackl: (amount) =>
        set((s) => ({ nacklBalance: s.nacklBalance + amount })),

      spendNackl: (amount) => {
        const balance = get().nacklBalance;
        if (balance < amount) return false;
        set({ nacklBalance: balance - amount });
        return true;
      },

      addXp: (amount) => {
        set((s) => {
          let xp = s.xp + amount;
          let level = s.level;
          let xpToNext = s.xpToNext;
          while (xp >= xpToNext) {
            xp -= xpToNext;
            level += 1;
            xpToNext = xpForLevel(level);
          }
          return { xp, level, xpToNext };
        });
      },

      recordTap: () => {
        const hour = new Date().getHours();
        set((s) => {
          const tapsByHour = [...s.stats.tapsByHour];
          tapsByHour[hour] = (tapsByHour[hour] || 0) + 1;
          const today = todayKey();
          const tapsByDay = [...s.stats.tapsByDay];
          const lastIdx = tapsByDay.length - 1;
          if (tapsByDay[lastIdx]?.date === today) {
            tapsByDay[lastIdx] = { ...tapsByDay[lastIdx], taps: tapsByDay[lastIdx].taps + 1 };
          } else {
            tapsByDay.push({ date: today, taps: 1, rewards: 0 });
            if (tapsByDay.length > 30) tapsByDay.shift();
          }
          return {
            totalTaps: s.totalTaps + 1,
            stats: { ...s.stats, tapsByHour, tapsByDay, peakHour: hour },
          };
        });
      },

      recordSession: (taps) => {
        set((s) => {
          const totalSessions = s.totalSessions + 1;
          const prevAvg = s.stats.averageSessionTaps;
          const averageSessionTaps =
            (prevAvg * (totalSessions - 1) + taps) / totalSessions;
          const bestSessionTaps = Math.max(s.stats.bestSessionTaps, taps);
          const totalPlayTimeMs = s.stats.totalPlayTimeMs + 15_000;
          return {
            totalSessions,
            stats: { ...s.stats, averageSessionTaps, bestSessionTaps, totalPlayTimeMs },
          };
        });
      },

      recordEpoch: () => {
        set((s) => ({
          totalEpochs: s.totalEpochs + 1,
          stats: {
            ...s.stats,
            bestEpochTaps: Math.max(s.stats.bestEpochTaps, s.totalTaps > 0 ? 70 : 0),
          },
        }));
      },

      recordReward: (amount) => {
        set((s) => ({
          totalRewards: s.totalRewards + amount,
          nacklBalance: s.nacklBalance + amount,
          stats: {
            ...s.stats,
            tapsByDay: s.stats.tapsByDay.map((d, i) =>
              i === s.stats.tapsByDay.length - 1
                ? { ...d, rewards: d.rewards + amount }
                : d,
            ),
          },
        }));
      },

      recordDayActive: () => {
        const today = todayKey();
        const last = get().lastActiveDay;
        if (last === today) return;
        const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
        const streak = last === yesterday ? get().streak + 1 : 1;
        set({ lastActiveDay: today, streak });
      },

      recordEquipmentPurchase: (cost) => {
        // already debited via spendNackl; no-op for tracking beyond stats
        void cost;
      },

      recordBoosterActivation: () => {
        // count tracked via boosters decrement
      },

      recordShare: () => {
        // count tracked via completedQuests check elsewhere
      },

      recordReferral: () => {
        set((s) => ({ referrals: s.referrals + 1 }));
      },

      ownEquipment: (id) => {
        set((s) =>
          s.ownedEquipment.includes(id)
            ? s
            : { ownedEquipment: [...s.ownedEquipment, id] },
        );
      },

      equip: (slot, id) => {
        set((s) => ({ equipped: { ...s.equipped, [slot]: id } }));
      },

      unlockAchievement: (id) => {
        set((s) =>
          s.unlockedAchievements.includes(id)
            ? s
            : { unlockedAchievements: [...s.unlockedAchievements, id] },
        );
      },

      completeQuest: (id) => {
        set((s) =>
          s.completedQuests.includes(id)
            ? s
            : { completedQuests: [...s.completedQuests, id] },
        );
      },

      claimQuest: (id) => {
        set((s) =>
          s.claimedQuests.includes(id)
            ? s
            : { claimedQuests: [...s.claimedQuests, id] },
        );
      },

      addBooster: (id, count = 1) => {
        set((s) => ({
          boosters: { ...s.boosters, [id]: (s.boosters[id] || 0) + count },
        }));
      },

      activateBooster: (id, durationMs) => {
        set((s) => {
          const owned = s.boosters[id] || 0;
          if (owned <= 0) return s;
          const active: ActiveBooster = {
            id,
            activatedAt: Date.now(),
            durationMs,
          };
          return {
            boosters: { ...s.boosters, [id]: owned - 1 },
            activeBoosters: [...s.activeBoosters, active],
          };
        });
      },

      tickActiveBoosters: () => {
        const now = Date.now();
        set((s) => ({
          activeBoosters: s.activeBoosters.filter(
            (b) => now - b.activatedAt < b.durationMs,
          ),
        }));
      },

      setReferralCode: (code) => set({ referralCode: code }),

      reset: () => set({ ...makeInitialPlayer() }),
    }),
    {
      name: "nacklforge-player",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
