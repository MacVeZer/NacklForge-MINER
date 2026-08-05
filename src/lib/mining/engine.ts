import type {
  MiningEngineState,
  MiningEpoch,
  MiningLogEntry,
  NacklAccount,
} from "@/lib/types";
import {
  CAN_START_POLL_MS,
  CHAIN_POLL_INTERVAL_MS,
  EPOCH_END_COOLDOWN_MS,
  EPOCH_WAIT_POLL_MS,
  MAX_TAPS_FIVEMIN,
  MINING_SESSION_MS,
  REWARD_RECOVERY_COOLDOWN_MS,
  SESSIONS_PER_EPOCH,
  SESSION_RESTART_DELAY_MS,
  SIM_TAP_REWARD,
  STUCK_TAPS_REWARD_MS,
  TAP_INTERVAL_MS,
  TAPS_PER_SESSION,
} from "@/lib/mining/constants";

/**
 * Browser-side mining engine that drives BOTH:
 *   - Simulation mode (no real account) — locally emulates the tap/epoch loop
 *   - Live mode (real Acki Nacki account JSON) — drives the bee_sdk.wasm
 *
 * The engine emits events via the provided emit callback. The React layer
 * subscribes and updates Zustand stores. The engine itself is framework-agnostic
 * so it can run inside a Web Worker if needed in the future.
 */

export type MiningEventType =
  | "ready"
  | "prepared"
  | "started"
  | "running"
  | "scheduled"
  | "waiting_seed"
  | "session_done"
  | "tap_computed"
  | "worker_status"
  | "epoch_reset"
  | "chain_data"
  | "reward_requested"
  | "reward_claimed"
  | "stopped"
  | "error";

export interface MiningEventPayload {
  type: MiningEventType;
  name?: string;
  message?: string;
  data?: Record<string, unknown>;
}

export type MiningEmit = (event: MiningEventPayload) => void;

interface MinerEntry {
  name: string;
  desired: boolean;
  running: boolean;
  starting: boolean;
  sessionTarget: number;
  sessionTaps: number;
  sessionCompleted: boolean;
  sessionId: string | null;
  sessionSeq: number;
  epoch5mStart: string;
  sessionsThisEpoch: number;
  tapsThisEpoch: number;
  deficit: number;
  lastChainAt: number;
  lastTapProgressAt: number;
  lastRewardRecoveryAt: number;
  rewardInFlight: boolean;
  rewardEpochs: string[];
  // timers
  tapTimer: ReturnType<typeof setInterval> | null;
  startTimer: ReturnType<typeof setTimeout> | null;
  restartTimer: ReturnType<typeof setTimeout> | null;
  canStartTimer: ReturnType<typeof setTimeout> | null;
  chainPollTimer: ReturnType<typeof setTimeout> | null;
  epochPollTimer: ReturnType<typeof setTimeout> | null;
  sessionEndTimer: ReturnType<typeof setTimeout> | null;
  timers: ReturnType<typeof setTimeout>[];
}

function makeEntry(name: string): MinerEntry {
  return {
    name,
    desired: false,
    running: false,
    starting: false,
    sessionTarget: TAPS_PER_SESSION,
    sessionTaps: 0,
    sessionCompleted: false,
    sessionId: null,
    sessionSeq: 0,
    epoch5mStart: "",
    sessionsThisEpoch: 0,
    tapsThisEpoch: 0,
    deficit: 0,
    lastChainAt: 0,
    lastTapProgressAt: 0,
    lastRewardRecoveryAt: 0,
    rewardInFlight: false,
    rewardEpochs: [],
    tapTimer: null,
    startTimer: null,
    restartTimer: null,
    canStartTimer: null,
    chainPollTimer: null,
    epochPollTimer: null,
    sessionEndTimer: null,
    timers: [],
  };
}

export class MiningEngine {
  private mode: "simulation" | "live" = "simulation";
  private miners = new Map<string, MinerEntry>();
  private emit: MiningEmit;
  private wasmReady = false;
  private wasmModule: any = null;
  private logBuffer: MiningLogEntry[] = [];
  private listeners = new Set<(entry: MiningLogEntry) => void>();
  public state: MiningEngineState = {
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
  };

  constructor(emit: MiningEmit) {
    this.emit = emit;
  }

  // ---- Log buffer ----
  pushLog(type: MiningLogEntry["type"], message: string, data?: Record<string, unknown>) {
    const entry: MiningLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      type,
      message,
      data,
    };
    this.logBuffer = [entry, ...this.logBuffer].slice(0, 200);
    this.listeners.forEach((l) => l(entry));
  }

  getLogs(): MiningLogEntry[] {
    return this.logBuffer;
  }

  subscribeLogs(fn: (entry: MiningLogEntry) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ---- Lifecycle ----
  async init(mode: "simulation" | "live" = "simulation"): Promise<boolean> {
    this.mode = mode;
    this.state.mode = mode;

    if (mode === "live" && typeof window !== "undefined") {
      try {
        // Dynamically import the bee_sdk.js shipped from /public/wasm
        // Use Function() to bypass webpack/Next.js static analysis — the path
        // is only known at runtime.
        const dynamicImport = new Function(
          "url",
          "return import(url)",
        ) as (url: string) => Promise<any>;
        const mod = await dynamicImport("/wasm/bee_sdk.js");
        if (mod?.default && typeof mod.default === "function") {
          await mod.default("/wasm/bee_sdk.wasm");
        }
        this.wasmModule = mod;
        this.wasmReady = true;
        this.state.ready = true;
        this.pushLog("ready", "WASM bee_sdk loaded — live mining enabled");
        this.emit({ type: "ready", data: { mode: "live" } });
        return true;
      } catch (err) {
        this.pushLog(
          "worker_error",
          `WASM load failed: ${err instanceof Error ? err.message : String(err)} — falling back to simulation`,
        );
        this.mode = "simulation";
        this.state.mode = "simulation";
      }
    }

    // Simulation mode — always succeeds
    this.wasmReady = false;
    this.state.ready = true;
    this.pushLog("ready", "Simulation mining engine ready");
    this.emit({ type: "ready", data: { mode: "simulation" } });
    return true;
  }

  isLive(): boolean {
    return this.mode === "live" && this.wasmReady;
  }

  // ---- Prepare ----
  async prepare(account: NacklAccount): Promise<{ name: string; ready: boolean; running: boolean }> {
    if (!account.name) throw new Error("account name is required");
    if (!this.miners.has(account.name)) {
      this.miners.set(account.name, makeEntry(account.name));
    }
    const entry = this.miners.get(account.name)!;
    entry.desired = true;
    this.pushLog("session_started", `Prepared miner "${account.name}"`);
    this.emit({ type: "prepared", name: account.name });

    // Schedule first chain poll and start
    this.scheduleChainPoll(account.name, entry);
    this.scheduleStart(account.name, entry, 0);

    return { name: account.name, ready: true, running: entry.running };
  }

  // ---- Start ----
  async start(name: string, startDelayMs = 0): Promise<{ name: string; running: boolean; scheduled?: boolean }> {
    const entry = this.miners.get(name);
    if (!entry) throw new Error(`miner is not prepared: ${name}`);
    entry.desired = true;

    if (entry.running || entry.starting) {
      this.emit({ type: "running", name });
      return { name, running: entry.running };
    }

    if (entry.startTimer) {
      this.emit({ type: "scheduled", name, data: { delayMs: startDelayMs } });
      return { name, running: false, scheduled: true };
    }

    if (startDelayMs && startDelayMs > 0) {
      entry.startTimer = setTimeout(() => {
        entry.startTimer = null;
        this.start(name, 0).catch((err) => this.handleError(name, err));
      }, startDelayMs);
      this.emit({ type: "scheduled", name, data: { delayMs: startDelayMs } });
      return { name, running: false, scheduled: true };
    }

    if (entry.epochPollTimer) {
      this.emit({ type: "scheduled", name, data: { delayMs: EPOCH_WAIT_POLL_MS } });
      return { name, running: false, scheduled: true };
    }

    if (!entry.lastChainAt || Date.now() - entry.lastChainAt > EPOCH_WAIT_POLL_MS - 500) {
      await this.fetchChainData(name, entry);
    }

    // Check epoch limits
    if (
      entry.sessionsThisEpoch >= SESSIONS_PER_EPOCH ||
      entry.tapsThisEpoch >= MAX_TAPS_FIVEMIN
    ) {
      this.scheduleEpochStartPoll(name, entry, "epoch_full");
      this.state.cooldown = true;
      this.emit({ type: "scheduled", name, data: { reason: "epoch_full" } });
      return { name, running: false, scheduled: true };
    }

    // Start a new session
    entry.sessionTaps = 0;
    entry.sessionTarget = TAPS_PER_SESSION;
    entry.sessionCompleted = false;
    this.stopTapLoop(entry);

    entry.starting = true;
    entry.running = false;
    entry.timers = [];

    try {
      entry.sessionSeq += 1;
      entry.sessionId = `${name}:${Date.now()}:${entry.sessionSeq}`;
      this.state.sessionId = entry.sessionId;
      this.state.sessionStartedAt = Date.now();
      this.state.sessionTaps = 0;
      this.state.sessionTarget = entry.sessionTarget;
      this.state.starting = true;

      // Emit started
      entry.running = true;
      entry.starting = false;
      this.state.running = true;
      this.state.starting = false;
      this.pushLog("session_started", `Session ${entry.sessionId} started`);

      this.scheduleTapPlan(name, entry);

      // End session after MINING_SESSION_MS
      entry.sessionEndTimer = setTimeout(() => {
        this.completeSession(name, entry, "finished", { taps: entry.sessionTaps });
      }, MINING_SESSION_MS);

      this.emit({
        type: "started",
        name,
        data: { sessionId: entry.sessionId, sessionsThisEpoch: entry.sessionsThisEpoch },
      });
      return { name, running: true };
    } catch (err) {
      entry.starting = false;
      this.handleError(name, err);
      throw err;
    }
  }

  // ---- Stop ----
  async stop(name: string): Promise<{ name: string; running: boolean }> {
    const entry = this.miners.get(name);
    if (!entry) return { name, running: false };
    entry.desired = false;
    this.stopTapLoop(entry);
    if (entry.sessionEndTimer) clearTimeout(entry.sessionEndTimer);
    entry.sessionEndTimer = null;
    entry.running = false;
    this.state.running = false;
    this.pushLog("session_started", `Stopped miner "${name}"`);
    this.emit({ type: "stopped", name });
    return { name, running: false };
  }

  stopAll() {
    for (const [name] of this.miners) {
      this.stop(name);
    }
  }

  // ---- Tap loop ----
  private scheduleTapPlan(name: string, entry: MinerEntry) {
    if (!entry.running) return;
    const regular = TAPS_PER_SESSION;
    for (let i = 0; i < regular; i += 1) {
      const t = setTimeout(() => this.pumpTap(name, entry), i * TAP_INTERVAL_MS);
      entry.timers.push(t);
    }
  }

  private pumpTap(name: string, entry: MinerEntry): boolean {
    if (!entry.running) return false;
    entry.sessionTaps += 1;
    entry.tapsThisEpoch = Math.min(MAX_TAPS_FIVEMIN, entry.tapsThisEpoch + 1);
    entry.lastTapProgressAt = Date.now();
    this.state.sessionTaps = entry.sessionTaps;
    this.state.totalMined += SIM_TAP_REWARD;
    this.state.pendingReward += SIM_TAP_REWARD;
    this.emit({
      type: "tap_computed",
      name,
      data: { taps: entry.sessionTaps, tapsThisEpoch: entry.tapsThisEpoch },
    });
    return true;
  }

  // ---- Chain data (simulated) ----
  private async fetchChainData(name: string, entry: MinerEntry) {
    if (!entry) return null;
    try {
      // Simulate chain data — generate epoch5mStart aligned to 5-minute boundaries
      const now = Date.now();
      const epoch5mStart = Math.floor(now / (5 * 60_000)) * (5 * 60_000);
      const epochStr = String(epoch5mStart);

      if (entry.epoch5mStart && epochStr !== entry.epoch5mStart) {
        this.resetEpoch(entry, epochStr);
        this.pushLog("epoch_reset", `Epoch reset to ${epochStr}`);
        this.emit({
          type: "epoch_reset",
          name,
          data: { epoch5mStart: epochStr, tapSum: entry.tapsThisEpoch, tapSum5m: entry.tapsThisEpoch },
        });
      } else if (!entry.epoch5mStart) {
        entry.epoch5mStart = epochStr;
      }

      entry.lastChainAt = now;
      if (!entry.lastTapProgressAt) entry.lastTapProgressAt = now;

      // Track reward epochs
      entry.rewardEpochs = entry.rewardEpochs || [];
      if (!entry.rewardEpochs.includes(epochStr)) entry.rewardEpochs.push(epochStr);
      if (entry.rewardEpochs.length >= 3 && !entry.rewardInFlight) {
        this.requestReward(name, entry, "three_epochs");
      }

      // Update external state
      const epoch: MiningEpoch = {
        epoch5mStart: entry.epoch5mStart,
        sessionsThisEpoch: entry.sessionsThisEpoch,
        tapsThisEpoch: entry.tapsThisEpoch,
        maxTapsPerEpoch: MAX_TAPS_FIVEMIN,
        maxSessionsPerEpoch: SESSIONS_PER_EPOCH,
      };
      this.state.epoch = epoch;

      this.emit({
        type: "chain_data",
        name,
        data: { epoch5mStart: entry.epoch5mStart, tapSum: entry.tapsThisEpoch, tapSum5m: entry.tapsThisEpoch },
      });

      this.maybeRecoverStuckTaps(name, entry);
      return { epoch5mStart: epochStr };
    } catch (err) {
      this.handleError(name, err);
      return null;
    }
  }

  private resetEpoch(entry: MinerEntry, epoch5mStart: string) {
    entry.epoch5mStart = epoch5mStart || entry.epoch5mStart;
    entry.sessionsThisEpoch = 0;
    entry.tapsThisEpoch = 0;
    entry.deficit = 0;
    entry.lastTapProgressAt = Date.now();
  }

  private requestReward(name: string, entry: MinerEntry, reason: string): boolean {
    if (!entry || entry.rewardInFlight) return false;
    const now = Date.now();
    if (
      entry.lastRewardRecoveryAt &&
      now - entry.lastRewardRecoveryAt < REWARD_RECOVERY_COOLDOWN_MS
    )
      return false;
    entry.rewardInFlight = true;
    entry.lastRewardRecoveryAt = now;
    this.pushLog("reward_claimed", `Reward claimed: ${this.state.pendingReward.toFixed(4)} NACKL (reason: ${reason})`);
    this.emit({ type: "reward_requested", name, data: { reason } });

    // Simulate async reward claim
    setTimeout(() => {
      this.state.lastRewardAt = Date.now();
      this.emit({
        type: "reward_claimed",
        name,
        data: { amount: this.state.pendingReward, reason },
      });
      this.state.pendingReward = 0;
      entry.rewardEpochs = [];
      entry.rewardInFlight = false;

      // Re-fetch chain data and possibly schedule next session
      this.fetchChainData(name, entry).finally(() => {
        if (entry.desired && !entry.running && !entry.starting) {
          this.scheduleStart(name, entry, 0);
        }
      });
    }, 500);
    return true;
  }

  private maybeRecoverStuckTaps(name: string, entry: MinerEntry) {
    if (!entry.desired || entry.running) return;
    const taps = entry.tapsThisEpoch;
    if (taps <= 0) return;
    const lastProgressAt = entry.lastTapProgressAt || entry.lastChainAt || Date.now();
    if (Date.now() - lastProgressAt < STUCK_TAPS_REWARD_MS) return;
    this.requestReward(name, entry, taps >= MAX_TAPS_FIVEMIN ? "stuck_full_epoch" : "stuck_taps");
  }

  private scheduleChainPoll(name: string, entry: MinerEntry) {
    if (!entry.desired || entry.running || entry.epochPollTimer) return;
    if (entry.chainPollTimer) clearTimeout(entry.chainPollTimer);
    entry.chainPollTimer = setTimeout(async () => {
      entry.chainPollTimer = null;
      await this.fetchChainData(name, entry);
      this.scheduleChainPoll(name, entry);
    }, CHAIN_POLL_INTERVAL_MS);
  }

  private scheduleStart(name: string, entry: MinerEntry, delay: number) {
    if (!entry.desired) return;
    if (entry.running || entry.starting || entry.startTimer || entry.canStartTimer || entry.restartTimer)
      return;
    entry.startTimer = setTimeout(() => {
      entry.startTimer = null;
      this.start(name, 0).catch((err) => this.handleError(name, err));
    }, Math.max(0, delay));
    this.emit({
      type: delay > 0 ? "scheduled" : "ready",
      name,
      data: { delayMs: Math.max(0, delay) },
    });
  }

  private scheduleEpochStartPoll(name: string, entry: MinerEntry, reason: string) {
    if (!entry.desired || entry.running || entry.epochPollTimer) return;
    if (entry.restartTimer) clearTimeout(entry.restartTimer);
    entry.restartTimer = null;
    this.emit({
      type: "scheduled",
      name,
      data: {
        delayMs: EPOCH_WAIT_POLL_MS,
        reason,
        sessionsThisEpoch: entry.sessionsThisEpoch,
        tapsThisEpoch: entry.tapsThisEpoch,
      },
    });
    entry.epochPollTimer = setTimeout(async () => {
      entry.epochPollTimer = null;
      const previousEpoch = entry.epoch5mStart;
      const data = await this.fetchChainData(name, entry);
      if (!entry.desired) return;
      const nextEpoch = data?.epoch5mStart || entry.epoch5mStart || "";
      const epochChanged = previousEpoch && nextEpoch && previousEpoch !== nextEpoch;
      if (epochChanged || entry.tapsThisEpoch <= 0) {
        this.resetEpoch(entry, nextEpoch || previousEpoch);
        this.start(name, 0).catch((err) => this.handleError(name, err));
        return;
      }
      this.scheduleEpochStartPoll(name, entry, reason);
    }, EPOCH_WAIT_POLL_MS);
  }

  private completeSession(name: string, entry: MinerEntry, status: string, data: { taps: number }) {
    if (entry.sessionCompleted) return;
    entry.sessionCompleted = true;
    const actualTaps = data.taps;
    const target = entry.sessionTarget;
    entry.sessionsThisEpoch += 1;
    entry.deficit = Math.max(0, Math.min(MAX_TAPS_FIVEMIN, entry.deficit + Math.max(0, target - actualTaps)));

    this.stopTapLoop(entry);
    if (entry.sessionEndTimer) clearTimeout(entry.sessionEndTimer);
    entry.sessionEndTimer = null;
    entry.running = false;
    this.state.running = false;
    this.state.sessionId = null;
    this.state.sessionStartedAt = null;

    this.pushLog(
      "session_completed",
      `Session complete — taps ${actualTaps}/${target}, status ${status}`,
    );
    this.emit({
      type: "session_done",
      name,
      data: {
        sessionId: entry.sessionId,
        status,
        actualTaps,
        target,
        sessionsThisEpoch: entry.sessionsThisEpoch,
        tapsThisEpoch: entry.tapsThisEpoch,
        deficit: entry.deficit,
      },
    });

    this.fetchChainData(name, entry).finally(() => {
      if (!entry.desired) return;
      if (
        entry.sessionsThisEpoch >= SESSIONS_PER_EPOCH ||
        entry.tapsThisEpoch >= MAX_TAPS_FIVEMIN
      ) {
        this.scheduleNextSession(name, entry, EPOCH_END_COOLDOWN_MS);
      } else {
        this.scheduleNextSession(name, entry, SESSION_RESTART_DELAY_MS);
      }
    });
  }

  private scheduleNextSession(name: string, entry: MinerEntry, delay: number) {
    if (!entry.desired) return;
    if (
      entry.sessionsThisEpoch >= SESSIONS_PER_EPOCH ||
      entry.tapsThisEpoch >= MAX_TAPS_FIVEMIN
    ) {
      this.scheduleEpochStartPoll(name, entry, "epoch_full");
      return;
    }
    if (entry.restartTimer) clearTimeout(entry.restartTimer);
    entry.restartTimer = setTimeout(() => {
      entry.restartTimer = null;
      this.start(name, 0).catch((err) => this.handleError(name, err));
    }, delay);
    this.emit({
      type: "scheduled",
      name,
      data: { delayMs: delay, sessionsThisEpoch: entry.sessionsThisEpoch },
    });
  }

  private stopTapLoop(entry: MinerEntry) {
    if (entry.tapTimer) clearInterval(entry.tapTimer);
    entry.tapTimer = null;
    if (entry.canStartTimer) clearTimeout(entry.canStartTimer);
    entry.canStartTimer = null;
    if (entry.restartTimer) clearTimeout(entry.restartTimer);
    entry.restartTimer = null;
    if (entry.chainPollTimer) clearTimeout(entry.chainPollTimer);
    entry.chainPollTimer = null;
    if (entry.epochPollTimer) clearTimeout(entry.epochPollTimer);
    entry.epochPollTimer = null;
    if (entry.sessionEndTimer) clearTimeout(entry.sessionEndTimer);
    entry.sessionEndTimer = null;
    if (Array.isArray(entry.timers)) {
      entry.timers.forEach((t) => clearTimeout(t));
    }
    entry.timers = [];
    entry.running = false;
    entry.starting = false;
  }

  private handleError(name: string | null, err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    this.state.lastError = message;
    this.pushLog("worker_error", message);
    this.emit({ type: "error", name: name || undefined, message });
  }

  // ---- Manual tap (player-initiated bonus tap) ----
  manualTap(name: string): number {
    const entry = this.miners.get(name);
    if (!entry) return 0;
    if (!entry.running) return 0;
    // Add an extra tap on top of the auto schedule (still respects MAX_TAPS_FIVEMIN)
    if (entry.tapsThisEpoch >= MAX_TAPS_FIVEMIN) return 0;
    this.pumpTap(name, entry);
    return SIM_TAP_REWARD;
  }

  // ---- External getters ----
  getEntry(name: string): MinerEntry | undefined {
    return this.miners.get(name);
  }

  getState(): MiningEngineState {
    return { ...this.state };
  }
}

// Singleton engine instance for the browser tab.
let engineInstance: MiningEngine | null = null;

export function getMiningEngine(): MiningEngine {
  if (!engineInstance) {
    engineInstance = new MiningEngine((event) => {
      // Default emit is a no-op; React layer overrides via subscribe.
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("nacklforge:mining-event", { detail: event }),
        );
      }
    });
  }
  return engineInstance;
}
