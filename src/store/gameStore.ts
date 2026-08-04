import { create } from "zustand";
import type { ViewKey, Quest } from "@/lib/types";
import { QUESTS } from "@/lib/game/quests";

interface GameStore {
  view: ViewKey;
  setView: (v: ViewKey) => void;

  // quest state (per-day)
  dailyQuests: Quest[];
  weeklyQuests: Quest[];
  oneTimeQuests: Quest[];

  // counters (today)
  todayTaps: number;
  todaySessions: number;
  todayEpochsFilled: number;
  todayEquipmentBought: number;
  todayBoostersActivated: number;
  todayShared: boolean;
  weeklyTaps: number;
  weeklySpent: number;

  // actions
  recordTap: () => void;
  recordSession: () => void;
  recordEpochFilled: () => void;
  recordEquipmentBought: (cost: number) => void;
  recordBoosterActivated: () => void;
  recordShare: () => void;
  resetDaily: () => void;
  resetWeekly: () => void;
  computeQuestState: (player: {
    totalTaps: number;
    totalSessions: number;
    totalEpochs: number;
    level: number;
    ownedEquipmentCount: number;
    referrals: number;
    streak: number;
    nacklBalance: number;
  }) => void;
}

function withProgress(q: typeof QUESTS[number]): Quest {
  return { ...q, progress: 0, completed: false, claimed: false };
}

export const useGameStore = create<GameStore>((set, get) => ({
  view: "forge",
  setView: (v) => set({ view: v }),

  dailyQuests: QUESTS.filter((q) => q.type === "daily").map(withProgress),
  weeklyQuests: QUESTS.filter((q) => q.type === "weekly").map(withProgress),
  oneTimeQuests: QUESTS.filter((q) => q.type === "one-time").map(withProgress),

  todayTaps: 0,
  todaySessions: 0,
  todayEpochsFilled: 0,
  todayEquipmentBought: 0,
  todayBoostersActivated: 0,
  todayShared: false,
  weeklyTaps: 0,
  weeklySpent: 0,

  recordTap: () => set((s) => ({ todayTaps: s.todayTaps + 1, weeklyTaps: s.weeklyTaps + 1 })),
  recordSession: () => set((s) => ({ todaySessions: s.todaySessions + 1 })),
  recordEpochFilled: () => set((s) => ({ todayEpochsFilled: s.todayEpochsFilled + 1 })),
  recordEquipmentBought: (cost) =>
    set((s) => ({
      todayEquipmentBought: s.todayEquipmentBought + 1,
      weeklySpent: s.weeklySpent + cost,
    })),
  recordBoosterActivated: () => set((s) => ({ todayBoostersActivated: s.todayBoostersActivated + 1 })),
  recordShare: () => set({ todayShared: true }),

  resetDaily: () =>
    set({
      todayTaps: 0,
      todaySessions: 0,
      todayEpochsFilled: 0,
      todayEquipmentBought: 0,
      todayBoostersActivated: 0,
      todayShared: false,
      dailyQuests: QUESTS.filter((q) => q.type === "daily").map(withProgress),
    }),

  resetWeekly: () =>
    set({
      weeklyTaps: 0,
      weeklySpent: 0,
      weeklyQuests: QUESTS.filter((q) => q.type === "weekly").map(withProgress),
    }),

  computeQuestState: (player) => {
    const s = get();
    const daily = s.dailyQuests.map((q) => {
      let progress = 0;
      switch (q.id) {
        case "daily-taps-50":
        case "daily-taps-200":
          progress = s.todayTaps;
          break;
        case "daily-sessions-5":
          progress = s.todaySessions;
          break;
        case "daily-epoch-full":
          progress = s.todayEpochsFilled;
          break;
        case "daily-buy-equipment":
          progress = s.todayEquipmentBought;
          break;
        case "daily-activate-booster":
          progress = s.todayBoostersActivated;
          break;
        case "daily-share":
          progress = s.todayShared ? 1 : 0;
          break;
      }
      return { ...q, progress: Math.min(progress, q.goal), completed: progress >= q.goal };
    });
    const weekly = s.weeklyQuests.map((q) => {
      let progress = 0;
      switch (q.id) {
        case "weekly-taps-2000":
          progress = s.weeklyTaps;
          break;
        case "weekly-streak-7":
          progress = player.streak;
          break;
        case "weekly-spend-10k":
          progress = s.weeklySpent;
          break;
      }
      return { ...q, progress: Math.min(progress, q.goal), completed: progress >= q.goal };
    });
    const oneTime = s.oneTimeQuests.map((q) => {
      let progress = 0;
      switch (q.id) {
        case "once-first-tap":
          progress = player.totalTaps;
          break;
        case "once-first-session":
          progress = player.totalSessions;
          break;
        case "once-first-equipment":
          progress = player.ownedEquipmentCount - 3; // starter 3 don't count
          break;
        case "once-first-referral":
          progress = player.referrals;
          break;
        case "once-level-10":
          progress = player.level;
          break;
      }
      return { ...q, progress: Math.min(progress, q.goal), completed: progress >= q.goal };
    });
    set({ dailyQuests: daily, weeklyQuests: weekly, oneTimeQuests: oneTime });
  },
}));
