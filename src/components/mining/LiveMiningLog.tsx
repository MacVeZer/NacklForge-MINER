"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMiningStore } from "@/store/miningStore";
import { cn } from "@/lib/utils";
import type { MiningLogEntry } from "@/lib/types";

const TYPE_COLORS: Record<MiningLogEntry["type"], string> = {
  session_started: "text-cyan-300",
  tap_computed: "text-amber-300",
  session_completed: "text-emerald-300",
  session_accepted: "text-lime-300",
  epoch_reset: "text-fuchsia-300",
  reward_claimed: "text-lime-300",
  worker_error: "text-rose-400",
  worker_status: "text-zinc-400",
  ready: "text-cyan-300",
  scheduled: "text-zinc-400",
  waiting_seed: "text-amber-400",
};

const TYPE_ICONS: Record<MiningLogEntry["type"], string> = {
  session_started: "[>]",
  tap_computed: "[+]",
  session_completed: "[✓]",
  session_accepted: "[★]",
  epoch_reset: "[↻]",
  reward_claimed: "[$]",
  worker_error: "[!]",
  worker_status: "[·]",
  ready: "[✓]",
  scheduled: "[⏳]",
  waiting_seed: "[⌛]",
};

export function LiveMiningLog() {
  const logs = useMiningStore((s) => s.logs);

  return (
    <div className="glass rounded-xl p-3 max-w-md mx-auto w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          Live Activity
        </span>
        <span className="text-[9px] text-zinc-600 font-mono">
          {logs.length} events
        </span>
      </div>
      <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1 font-mono text-[10px]">
        <AnimatePresence initial={false}>
          {logs.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-zinc-600 italic"
            >
              No activity yet. Press Start to begin mining.
            </motion.div>
          )}
          {logs.slice(0, 20).map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-1.5"
            >
              <span className="text-zinc-600 flex-shrink-0">
                {new Date(log.timestamp).toLocaleTimeString([], {
                  hour12: false,
                })}
              </span>
              <span
                className={cn(
                  "flex-shrink-0",
                  TYPE_COLORS[log.type] || "text-zinc-400",
                )}
              >
                {TYPE_ICONS[log.type] || "[ ]"}
              </span>
              <span className="text-zinc-400 truncate">{log.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
