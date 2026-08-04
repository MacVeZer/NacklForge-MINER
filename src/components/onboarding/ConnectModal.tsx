"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Hammer, Zap, Trophy, Award, ChevronRight, Sparkles, Cpu } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { useMiningStore } from "@/store/miningStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ConnectModalProps {
  open: boolean;
  onClose: () => void;
}

export function ConnectModal({ open, onClose }: ConnectModalProps) {
  const [step, setStep] = useState<"intro" | "name" | "mode" | "account">("intro");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"simulation" | "live">("simulation");
  const [accountJson, setAccountJson] = useState("");

  const connect = usePlayerStore((s) => s.connect);
  const initEngine = useMiningStore((s) => s.init);
  const prepareAndStart = useMiningStore((s) => s.prepareAndStart);

  async function handleFinish() {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    connect(name.trim());
    await initEngine(mode);

    if (mode === "live" && accountJson.trim()) {
      try {
        const parsed = JSON.parse(accountJson);
        await prepareAndStart({
          name: name.trim(),
          publicKey: parsed.publicKey,
          secretKey: parsed.secretKey,
          minerAddress: parsed.minerAddress,
          appId: parsed.appId,
          endpoints: parsed.endpoints,
        });
        toast.success("Live mining started!");
      } catch (err) {
        toast.error("Failed to start live mining — using simulation");
        await prepareAndStart({ name: name.trim() });
      }
    } else {
      await prepareAndStart({ name: name.trim() });
      toast.success(`Welcome to NacklForge, ${name}!`);
    }

    onClose();
  }

  function handleSkip() {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    connect(name.trim());
    initEngine("simulation").then(() => {
      prepareAndStart({ name: name.trim() });
      toast.success(`Welcome to NacklForge, ${name}!`);
      onClose();
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="glass-strong rounded-3xl w-full max-w-md p-6 relative overflow-hidden"
          >
            {/* Background glow */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at top, oklch(0.78 0.2 70 / 30%) 0%, transparent 60%)",
              }}
            />

            <div className="relative">
              {/* Logo */}
              <div className="flex flex-col items-center mb-4">
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 24px oklch(0.78 0.2 70 / 35%)",
                      "0 0 48px oklch(0.78 0.2 70 / 60%)",
                      "0 0 24px oklch(0.78 0.2 70 / 35%)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3"
                >
                  <Hammer className="w-9 h-9 text-zinc-950" strokeWidth={2} />
                </motion.div>
                <h1 className="text-2xl font-bold gradient-text-amber">NacklForge</h1>
                <p className="text-xs text-zinc-500 mt-1 text-center">
                  The premium tap-to-mine app for the Nackl token
                </p>
              </div>

              {/* Step: intro */}
              {step === "intro" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3"
                >
                  <FeatureRow
                    icon={<Hammer className="w-4 h-4" />}
                    title="Tap-to-Mine"
                    desc="Real on-chain Nackl mining via WASM"
                    color="text-amber-300"
                  />
                  <FeatureRow
                    icon={<Zap className="w-4 h-4" />}
                    title="Upgrade Gear"
                    desc="22 pieces across 5 slots & 5 rarities"
                    color="text-cyan-300"
                  />
                  <FeatureRow
                    icon={<Trophy className="w-4 h-4" />}
                    title="Climb Ranks"
                    desc="Global leaderboard with daily resets"
                    color="text-fuchsia-300"
                  />
                  <FeatureRow
                    icon={<Award className="w-4 h-4" />}
                    title="Earn Rewards"
                    desc="Quests, achievements, referrals, boosters"
                    color="text-lime-300"
                  />

                  <button
                    onClick={() => setStep("name")}
                    className="btn-shimmer w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                  >
                    Enter the Forge
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* Step: name */}
              {step === "name" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
                      Forge Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. ForgeMaster"
                      maxLength={20}
                      className="w-full mt-1.5 bg-zinc-950/60 border border-zinc-700/40 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setStep("mode");
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep("intro")}
                      className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wider hover:bg-zinc-700 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setStep("mode")}
                      disabled={!name.trim()}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all",
                        name.trim()
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 btn-shimmer"
                          : "bg-zinc-800 text-zinc-600 cursor-not-allowed",
                      )}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step: mode */}
              {step === "mode" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3"
                >
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
                    Mining Mode
                  </div>
                  <button
                    onClick={() => {
                      setMode("simulation");
                      handleSkip();
                    }}
                    className="w-full p-3 rounded-xl border border-cyan-400/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-cyan-300" />
                      <span className="text-sm font-bold text-cyan-200">Quick Start (Simulation)</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      No wallet needed. Try the full gamified experience instantly.
                    </p>
                  </button>
                  <button
                    onClick={() => setStep("account")}
                    className="w-full p-3 rounded-xl border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Cpu className="w-4 h-4 text-amber-300" />
                      <span className="text-sm font-bold text-amber-200">Connect Acki Nacki Account</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Provide your account JSON to mine real Nackl on-chain.
                    </p>
                  </button>
                  <button
                    onClick={() => setStep("name")}
                    className="w-full py-2 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wider hover:bg-zinc-700 transition-colors"
                  >
                    Back
                  </button>
                </motion.div>
              )}

              {/* Step: account */}
              {step === "account" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
                      Acki Nacki Account JSON
                    </label>
                    <textarea
                      value={accountJson}
                      onChange={(e) => setAccountJson(e.target.value)}
                      placeholder={'{"name":"...","publicKey":"...","secretKey":"...","minerAddress":"..."}'}
                      rows={5}
                      className="w-full mt-1.5 bg-zinc-950/60 border border-zinc-700/40 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 resize-none"
                    />
                    <p className="text-[10px] text-zinc-600 mt-1">
                      Your keys never leave this browser. Mining runs via the same bee_sdk.wasm as the official MinerGo app.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep("mode")}
                      className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wider hover:bg-zinc-700 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleFinish}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-bold uppercase tracking-wider text-sm btn-shimmer flex items-center justify-center gap-2"
                    >
                      Start Live Mining
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FeatureRow({
  icon,
  title,
  desc,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/3 border border-white/5">
      <div className={cn("flex-shrink-0", color)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-zinc-100">{title}</div>
        <div className="text-[11px] text-zinc-500">{desc}</div>
      </div>
    </div>
  );
}
