"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ForgeBackground } from "@/components/layout/ForgeBackground";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ConnectModal } from "@/components/onboarding/ConnectModal";
import { ForgeView } from "@/components/mining/ForgeView";
import { EquipmentView } from "@/components/equipment/EquipmentView";
import { QuestsView } from "@/components/quests/QuestsView";
import { LeaderboardView } from "@/components/leaderboard/LeaderboardView";
import { AchievementsView } from "@/components/achievements/AchievementsView";
import { StatsView } from "@/components/stats/StatsView";
import { ReferralsView } from "@/components/referrals/ReferralsView";
import { BoostersView } from "@/components/boosters/BoostersView";
import { useGameStore } from "@/store/gameStore";
import { usePlayerStore } from "@/store/playerStore";
import { useMiningStore } from "@/store/miningStore";

export default function Home() {
  const view = useGameStore((s) => s.view);
  const name = usePlayerStore((s) => s.name);
  const _hasHydrated = usePlayerStore((s) => s._hasHydrated);
  const initEngine = useMiningStore((s) => s.init);
  const prepareAndStart = useMiningStore((s) => s.prepareAndStart);
  const tickSession = useMiningStore((s) => s.tickSession);
  const recordDayActive = usePlayerStore((s) => s.recordDayActive);
  const tickActiveBoosters = usePlayerStore((s) => s.tickActiveBoosters);

  const [showOnboarding, setShowOnboarding] = useState(false);

  // After hydration, if no name → show onboarding. Otherwise initialize mining.
  useEffect(() => {
    if (!_hasHydrated) return;
    if (!name) {
      // Defer to next tick so we don't synchronously setState in effect body
      const id = setTimeout(() => setShowOnboarding(true), 0);
      return () => clearTimeout(id);
    }
    // Initialize engine and start mining for returning users
    let cancelled = false;
    (async () => {
      await initEngine("simulation");
      if (cancelled) return;
      await prepareAndStart({ name });
      if (cancelled) return;
      recordDayActive();
    })();
    return () => {
      cancelled = true;
    };
  }, [_hasHydrated, name, initEngine, prepareAndStart, recordDayActive]);

  // Tick session state and active boosters every 250ms
  useEffect(() => {
    const id = setInterval(() => {
      tickSession();
      tickActiveBoosters();
    }, 250);
    return () => clearInterval(id);
  }, [tickSession, tickActiveBoosters]);

  // Auto-reset daily quests at midnight
  useEffect(() => {
    const checkDaily = () => {
      const today = new Date().toISOString().slice(0, 10);
      const last = usePlayerStore.getState().lastActiveDay;
      if (last !== today) {
        useGameStore.getState().resetDaily();
        // weekly reset on Mondays
        if (new Date().getDay() === 1) {
          useGameStore.getState().resetWeekly();
        }
      }
    };
    checkDaily();
    const id = setInterval(checkDaily, 60_000);
    return () => clearInterval(id);
  }, []);

  // Don't render until hydration completes to avoid SSR mismatch
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ForgeBackground />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 rounded-full border-2 border-amber-400/30 border-t-amber-400"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ForgeBackground />
      <Header />

      <main className="flex-1 mx-auto w-full max-w-3xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === "forge" && <ForgeView />}
            {view === "equipment" && <EquipmentView />}
            {view === "quests" && <QuestsView />}
            {view === "leaderboard" && <LeaderboardView />}
            {view === "achievements" && <AchievementsView />}
            {view === "stats" && <StatsView />}
            {view === "referrals" && <ReferralsView />}
            {view === "boosters" && <BoostersView />}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />

      <ConnectModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  );
}
