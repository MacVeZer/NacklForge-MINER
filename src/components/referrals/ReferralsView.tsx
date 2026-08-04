"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Copy, Share2, UserPlus, Users, Gift, Sparkles } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ReferralsView() {
  const referralCode = usePlayerStore((s) => s.referralCode);
  const referrals = usePlayerStore((s) => s.referrals);
  const name = usePlayerStore((s) => s.name);
  const recordShare = useGameStore((s) => s.recordShare);
  const computeQuests = useGameStore((s) => s.computeQuests);
  const addNackl = usePlayerStore((s) => s.addNackl);
  const [simulatedRef, setSimulatedRef] = useState(0);

  const shareLink = `https://nacklforge.app/?ref=${referralCode}`;

  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareLink).then(() => {
        toast.success("Referral link copied!");
      }).catch(() => {
        toast.error("Copy failed — long-press to copy manually");
      });
    }
    recordShare();
    computeQuests({
      totalTaps: usePlayerStore.getState().totalTaps,
      totalSessions: usePlayerStore.getState().totalSessions,
      totalEpochs: usePlayerStore.getState().totalEpochs,
      level: usePlayerStore.getState().level,
      ownedEquipmentCount: usePlayerStore.getState().ownedEquipment.length,
      referrals: usePlayerStore.getState().referrals,
      streak: usePlayerStore.getState().streak,
      nacklBalance: usePlayerStore.getState().nacklBalance,
    });
  }

  function handleShare() {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      (navigator as any).share({
        title: "NacklForge — Tap-to-mine Nackl",
        text: `Join me on NacklForge and start mining Nackl! Use my code: ${referralCode}`,
        url: shareLink,
      }).catch(() => {
        handleCopy();
      });
    } else {
      handleCopy();
    }
  }

  function handleSimulateReferral() {
    // Demo: simulate a friend joining via your link
    setSimulatedRef((n) => n + 1);
    usePlayerStore.getState().recordReferral();
    addNackl(500); // referral bonus
    toast.success("Friend joined via your link!", {
      description: "+500 NACKL referral bonus",
    });
    computeQuests({
      totalTaps: usePlayerStore.getState().totalTaps,
      totalSessions: usePlayerStore.getState().totalSessions,
      totalEpochs: usePlayerStore.getState().totalEpochs,
      level: usePlayerStore.getState().level,
      ownedEquipmentCount: usePlayerStore.getState().ownedEquipment.length,
      referrals: usePlayerStore.getState().referrals,
      streak: usePlayerStore.getState().streak,
      nacklBalance: usePlayerStore.getState().nacklBalance,
    });
  }

  const totalRef = referrals + simulatedRef;
  const earnedFromRefs = totalRef * 500;

  return (
    <div className="px-3 pt-2 pb-32 space-y-4">
      <div>
        <h2 className="text-xl font-bold gradient-text-amber">Invite Friends</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Earn 500 NACKL for every friend who joins via your link. Plus 5% of their lifetime taps.
        </p>
      </div>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-2xl p-5 relative overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at top right, oklch(0.75 0.18 195 / 30%) 0%, transparent 60%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-100">Your referral code</div>
              <div className="text-[10px] text-zinc-500">Share to earn rewards</div>
            </div>
          </div>
          <div className="bg-zinc-950/60 border border-cyan-400/20 rounded-xl p-3 font-mono text-cyan-300 text-sm tracking-wider mb-3">
            {referralCode || "Connect wallet to get code"}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 hover:bg-cyan-500/30 transition-colors text-xs font-bold uppercase tracking-wider"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Link
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 text-xs font-bold uppercase tracking-wider btn-shimmer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="glass rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-300 tabular-nums">{totalRef}</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">
            Friends Joined
          </div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-lime-300 tabular-nums">
            {earnedFromRefs.toLocaleString()}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">
            NACKL Earned
          </div>
        </div>
      </div>

      {/* Reward tiers */}
      <div className="glass rounded-2xl p-4">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
          Reward milestones
        </div>
        <div className="space-y-2">
          {[
            { count: 1, reward: "Bronze Recruiter badge + 500 NACKL", unlocked: totalRef >= 1 },
            { count: 5, reward: "Silver Recruiter + 5,000 NACKL + 5% boost", unlocked: totalRef >= 5 },
            { count: 10, reward: "Gold Recruiter + 25,000 NACKL + 10% boost", unlocked: totalRef >= 10 },
            { count: 50, reward: "Diamond Recruiter + 100,000 NACKL + 25% boost", unlocked: totalRef >= 50 },
            { count: 100, reward: "Forge Ambassador — exclusive cosmetic", unlocked: totalRef >= 100 },
          ].map((tier) => (
            <div
              key={tier.count}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg border",
                tier.unlocked
                  ? "bg-amber-500/10 border-amber-400/30"
                  : "bg-zinc-800/30 border-zinc-700/30",
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                  tier.unlocked
                    ? "bg-amber-500 text-zinc-950"
                    : "bg-zinc-700 text-zinc-500",
                )}
              >
                {tier.unlocked ? <Gift className="w-4 h-4" /> : tier.count}
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-zinc-200">{tier.reward}</div>
                <div className="text-[10px] text-zinc-500">{tier.count} friends</div>
              </div>
              {tier.unlocked && <Sparkles className="w-4 h-4 text-amber-300" />}
            </div>
          ))}
        </div>
      </div>

      {/* Demo button */}
      <button
        onClick={handleSimulateReferral}
        className="w-full py-3 rounded-xl bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-400/30 hover:bg-fuchsia-500/25 transition-colors text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
      >
        <UserPlus className="w-4 h-4" />
        Simulate Friend Joining (demo)
      </button>

      <p className="text-[10px] text-zinc-600 text-center px-4">
        Welcome to NacklForge, {name || "Forge Guest"}! In production, this screen would
        integrate with the Nackl on-chain referral contract to verify real referrals.
      </p>
    </div>
  );
}
