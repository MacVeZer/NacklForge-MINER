import { create } from "zustand";
import type {
  MiningEngineState,
  MiningEpoch,
  MiningLogEntry,
  NacklAccount,
} from "@/lib/types";
import { getMiningEngine } from "@/lib/mining/engine";
import { TAPS_PER_SESSION } from "@/lib/mining/constants";

interface MiningStore {
  // engine state mirror
  mode: "simulation" | "live";
  ready: boolean;
  running: boolean;
  starting: boolean;
  waitingSeed: boolean;
  cooldown: boolean;
  sessionId: string | null;
  sessionStartedAt: number | null;
  sessionTaps: number;
  sessionTarget: number;
  epoch: MiningEpoch | null;
  lastError: string | null;
  autopilot: boolean;
  totalMined: number;
  pendingReward: number;
  lastRewardAt: number | null;

  // live tap feed for animations
  recentTaps: { id: string; at: number; amount: number }[];

  // logs
  logs: MiningLogEntry[];

  // account
  account: NacklAccount | null;

  // actions
  init: (mode: "simulation" | "live") => Promise<boolean>;
  prepareAndStart: (account: NacklAccount) => Promise<void>;
  startNow: () => Promise<void>;
  stopNow: () => Promise<void>;
  manualTap: () => number;
  toggleAutopilot: () => void;
  pushLog: (entry: MiningLogEntry) => void;
  clearLogs: () => void;
  subscribeLogs: (fn: (entry: MiningLogEntry) => void) => () => void;
  tickSession: () => void;
}

export const useMiningStore = create<MiningStore>((set, get) => {
  let unsubEngine: (() => void) | null = null;
  let unsubLogs: (() => void) | null = null;

  return {
    mode: "simulation",
    ready: false,
    running: false,
    starting: false,
    waitingSeed: false,
    cooldown: false,
    sessionId: null,
    sessionStartedAt: null,
    sessionTaps: 0,
    sessionTarget: TAPS_PER_SESSION,
    epoch: null,
    lastError: null,
    autopilot: false,
    totalMined: 0,
    pendingReward: 0,
    lastRewardAt: null,
    recentTaps: [],
    logs: [],
    account: null,

    init: async (mode) => {
      const engine = getMiningEngine();
      const ok = await engine.init(mode);
      set({
        mode: engine.state.mode,
        ready: engine.state.ready,
      });

      // Subscribe to engine events (via window CustomEvent dispatch)
      if (typeof window !== "undefined" && !unsubEngine) {
        const handler = (e: Event) => {
          const ev = (e as CustomEvent).detail;
          if (!ev) return;
          const engineState = engine.getState();
          set({
            mode: engineState.mode,
            ready: engineState.ready,
            running: engineState.running,
            starting: engineState.starting,
            waitingSeed: engineState.waitingSeed,
            cooldown: engineState.cooldown,
            sessionId: engineState.sessionId,
            sessionStartedAt: engineState.sessionStartedAt,
            sessionTaps: engineState.sessionTaps,
            sessionTarget: engineState.sessionTarget,
            epoch: engineState.epoch,
            lastError: engineState.lastError,
            totalMined: engineState.totalMined,
            pendingReward: engineState.pendingReward,
            lastRewardAt: engineState.lastRewardAt,
          });

          if (ev.type === "tap_computed") {
            const amount = 0.0072;
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            set((s) => ({
              recentTaps: [
                ...s.recentTaps.slice(-30),
                { id, at: Date.now(), amount },
              ],
            }));
          }
          if (ev.type === "session_done" && ev.data?.actualTaps !== undefined) {
            // Engine handled it; UI can subscribe via logs
          }
        };
        window.addEventListener("nacklforge:mining-event", handler as EventListener);
        unsubEngine = () =>
          window.removeEventListener(
            "nacklforge:mining-event",
            handler as EventListener,
          );
      }

      // Subscribe to engine logs
      if (!unsubLogs) {
        unsubLogs = engine.subscribeLogs((entry) => {
          set((s) => ({ logs: [entry, ...s.logs].slice(0, 200) }));
        });
      }

      return ok;
    },

    prepareAndStart: async (account) => {
      const engine = getMiningEngine();
      set({ account });
      await engine.prepare(account);
      await engine.start(account.name, 0);
    },

    startNow: async () => {
      const account = get().account;
      if (!account) return;
      const engine = getMiningEngine();
      await engine.start(account.name, 0);
    },

    stopNow: async () => {
      const account = get().account;
      if (!account) return;
      const engine = getMiningEngine();
      await engine.stop(account.name);
    },

    manualTap: () => {
      const account = get().account;
      if (!account) return 0;
      const engine = getMiningEngine();
      const reward = engine.manualTap(account.name);
      if (reward > 0) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        set((s) => ({
          recentTaps: [
            ...s.recentTaps.slice(-30),
            { id, at: Date.now(), amount: reward },
          ],
        }));
      }
      return reward;
    },

    toggleAutopilot: () => {
      set((s) => ({ autopilot: !s.autopilot }));
    },

    pushLog: (entry) => {
      set((s) => ({ logs: [entry, ...s.logs].slice(0, 200) }));
    },

    clearLogs: () => set({ logs: [] }),

    subscribeLogs: (fn) => {
      const engine = getMiningEngine();
      return engine.subscribeLogs(fn);
    },

    tickSession: () => {
      const engine = getMiningEngine();
      const state = engine.getState();
      set({
        sessionTaps: state.sessionTaps,
        sessionTarget: state.sessionTarget,
        sessionStartedAt: state.sessionStartedAt,
        sessionId: state.sessionId,
        running: state.running,
        epoch: state.epoch,
        pendingReward: state.pendingReward,
        totalMined: state.totalMined,
      });
    },
  };
});
