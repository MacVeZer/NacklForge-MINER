// Core types for NacklForge

export type ViewKey =
  | "forge"
  | "equipment"
  | "quests"
  | "leaderboard"
  | "achievements"
  | "stats"
  | "referrals"
  | "boosters"
  | "settings";

export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export type EquipmentSlot =
  | "rig"
  | "cooling"
  | "power"
  | "amplifier"
  | "booster";

export interface EquipmentItem {
  id: string;
  slot: EquipmentSlot;
  name: string;
  description: string;
  rarity: Rarity;
  tier: number;
  cost: number;
  tapMultiplier: number;
  cooldownReductionMs: number;
  rewardMultiplier: number;
  icon: string;
  accent: "amber" | "cyan" | "magenta" | "lime" | "violet";
}

export interface PlayerState {
  name: string | null;
  connectedAt: number | null;
  level: number;
  xp: number;
  xpToNext: number;
  nacklBalance: number;
  totalTaps: number;
  totalSessions: number;
  totalEpochs: number;
  totalRewards: number;
  streak: number;
  lastActiveDay: string | null;
  ownedEquipment: string[];
  equipped: Record<EquipmentSlot, string | null>;
  unlockedAchievements: string[];
  completedQuests: string[];
  claimedQuests: string[];
  referralCode: string;
  referrals: number;
  boosters: Record<string, number>; // boosterId -> count owned
  activeBoosters: ActiveBooster[];
  stats: {
    bestSessionTaps: number;
    bestEpochTaps: number;
    averageSessionTaps: number;
    totalPlayTimeMs: number;
    peakHour: number;
    tapsByHour: number[];
    tapsByDay: { date: string; taps: number; rewards: number }[];
  };
}

export interface ActiveBooster {
  id: string;
  activatedAt: number;
  durationMs: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: "daily" | "weekly" | "one-time";
  category: "mining" | "social" | "progression" | "economic";
  goal: number;
  reward: { nackl: number; xp: number };
  icon: string;
  accent: "amber" | "cyan" | "magenta" | "lime" | "violet";
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: "mining" | "collection" | "social" | "milestone";
  rarity: Rarity;
  goal: number;
  metric:
    | "totalTaps"
    | "totalSessions"
    | "totalEpochs"
    | "totalRewards"
    | "level"
    | "ownedEquipment"
    | "referrals"
    | "streak"
    | "nacklBalance";
  icon: string;
  reward: { nackl: number; xp: number };
}

export interface BoosterDef {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  effect: "tap_multiplier" | "reward_multiplier" | "cooldown_skip" | "auto_tap";
  magnitude: number;
  icon: string;
  accent: "amber" | "cyan" | "magenta" | "lime" | "violet";
  cost: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  taps: number;
  rewards: number;
  level: number;
  isPlayer?: boolean;
  country?: string;
}

export interface MiningSession {
  id: string;
  startedAt: number;
  endedAt: number | null;
  taps: number;
  target: number;
  status: "running" | "completed" | "failed" | "accepted";
  reward: number;
}

export interface MiningEpoch {
  epoch5mStart: string;
  sessionsThisEpoch: number;
  tapsThisEpoch: number;
  maxTapsPerEpoch: number;
  maxSessionsPerEpoch: number;
}

export interface MiningLogEntry {
  id: string;
  timestamp: number;
  type:
    | "session_started"
    | "tap_computed"
    | "session_completed"
    | "session_accepted"
    | "epoch_reset"
    | "reward_claimed"
    | "worker_error"
    | "worker_status"
    | "ready"
    | "scheduled"
    | "waiting_seed";
  message: string;
  data?: Record<string, unknown>;
}

export interface NacklAccount {
  name: string;
  publicKey?: string;
  secretKey?: string;
  minerAddress?: string;
  appId?: string;
  endpoints?: string[];
}

export interface MiningEngineState {
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
}
