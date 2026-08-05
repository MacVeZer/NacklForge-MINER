// Mining constants — mirrors MinerGo bee_runner.html config so behavior matches
// the on-chain Acki Nacki mining contract.

export const MINING_APP_ID =
  "0x0000000000000000000000000000000000000000000000000000000000000010";

export const MINING_SESSION_MS = 15_000;
export const SESSION_RESTART_DELAY_MS = 18_000;
export const TAPS_PER_SESSION = 7;
export const TAP_INTERVAL_MS = 2_000;
export const SESSIONS_PER_EPOCH = 10;
export const MAX_TAPS_FIVEMIN = 70;
export const EPOCH_END_COOLDOWN_MS = 60_000;
export const CHAIN_POLL_INTERVAL_MS = 5_000;
export const EPOCH_WAIT_POLL_MS = 5_000;
export const CAN_START_POLL_MS = 1_000;
export const STUCK_TAPS_REWARD_MS = 90_000;
export const REWARD_RECOVERY_COOLDOWN_MS = 120_000;
export const MAX_DEFICIT_COMPENSATION = 10;
export const CATCHUP_SPACING_MS = 100;

export const DEFAULT_ENDPOINTS = [
  "https://mainnet-cf.ackinacki.org/",
  "https://mainnet.ackinacki.org/",
];

// Simulation-mode reward per tap — tuned so a 5-minute epoch yields ~0.5 Nackl.
export const SIM_TAP_REWARD = 0.0072;

// Conversion: 1 XP earned per tap (multiplied by tapMultiplier at runtime).
export const XP_PER_TAP = 1;

// XP curve — quadratic so early levels feel fast.
export function xpForLevel(level: number): number {
  return Math.floor(80 * level * level + 120 * level);
}
