"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Lock, Check, Coins, ChevronRight } from "lucide-react";
import { EQUIPMENT, RARITY_COLORS, RARITY_LABEL, SLOT_LABELS } from "@/lib/game/equipment";
import type { EquipmentItem, EquipmentSlot } from "@/lib/types";
import { usePlayerStore } from "@/store/playerStore";
import { useGameStore } from "@/store/gameStore";
import { IconResolver } from "@/components/IconResolver";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SLOTS: EquipmentSlot[] = ["rig", "cooling", "power", "amplifier", "booster"];

export function EquipmentView() {
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot>("rig");
  const owned = usePlayerStore((s) => s.ownedEquipment);
  const equipped = usePlayerStore((s) => s.equipped);
  const nacklBalance = usePlayerStore((s) => s.nacklBalance);
  const ownEquipment = usePlayerStore((s) => s.ownEquipment);
  const equip = usePlayerStore((s) => s.equip);
  const spendNackl = usePlayerStore((s) => s.spendNackl);
  const recordEquipmentBought = useGameStore((s) => s.recordEquipmentBought);

  const items = EQUIPMENT.filter((e) => e.slot === selectedSlot);
  const equippedId = equipped[selectedSlot];

  function handleBuy(item: EquipmentItem) {
    if (owned.includes(item.id)) return;
    if (nacklBalance < item.cost) {
      toast.error(`Not enough NACKL — need ${item.cost.toLocaleString()}`);
      return;
    }
    const ok = spendNackl(item.cost);
    if (!ok) {
      toast.error("Transaction failed");
      return;
    }
    ownEquipment(item.id);
    equip(item.slot, item.id);
    recordEquipmentBought(item.cost);
    toast.success(`Acquired ${item.name}!`, {
      description: `${RARITY_LABEL[item.rarity]} ${SLOT_LABELS[item.slot]} equipped`,
    });
  }

  function handleEquip(item: EquipmentItem) {
    if (!owned.includes(item.id)) return;
    equip(item.slot, item.id);
    toast.success(`Equipped ${item.name}`);
  }

  const totalMult = SLOTS.reduce((acc, slot) => {
    const id = equipped[slot];
    if (!id) return acc;
    const item = EQUIPMENT.find((e) => e.id === id);
    return acc * (item?.tapMultiplier || 1);
  }, 1);
  const totalRewardMult = SLOTS.reduce((acc, slot) => {
    const id = equipped[slot];
    if (!id) return acc;
    const item = EQUIPMENT.find((e) => e.id === id);
    return acc * (item?.rewardMultiplier || 1);
  }, 1);
  const totalCooldownReduction = SLOTS.reduce((acc, slot) => {
    const id = equipped[slot];
    if (!id) return acc;
    const item = EQUIPMENT.find((e) => e.id === id);
    return acc + (item?.cooldownReductionMs || 0);
  }, 0);

  return (
    <div className="px-3 pt-2 pb-32 space-y-4">
      <div>
        <h2 className="text-xl font-bold gradient-text-amber">Forge Arsenal</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Acquire and equip gear to multiply every tap. Higher rarity = bigger boost.
        </p>
      </div>

      {/* Equipped summary */}
      <div className="glass-strong rounded-2xl p-4">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
          Active Bonuses
        </div>
        <div className="grid grid-cols-3 gap-2">
          <BonusStat label="Tap Mult" value={`×${totalMult.toFixed(2)}`} accent="text-amber-300" />
          <BonusStat label="Reward Mult" value={`×${totalRewardMult.toFixed(2)}`} accent="text-lime-300" />
          <BonusStat label="Cooldown" value={`-${(totalCooldownReduction / 1000).toFixed(1)}s`} accent="text-cyan-300" />
        </div>
      </div>

      {/* Slot selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3">
        {SLOTS.map((slot) => {
          const id = equipped[slot];
          const item = EQUIPMENT.find((e) => e.id === id);
          const isActive = slot === selectedSlot;
          return (
            <button
              key={slot}
              onClick={() => setSelectedSlot(slot)}
              className={cn(
                "flex-shrink-0 flex flex-col items-center justify-center gap-1 px-3 py-2.5 rounded-xl border transition-all min-w-[72px]",
                isActive
                  ? "bg-amber-500/15 border-amber-400/40 text-amber-200"
                  : "glass border-zinc-700/40 text-zinc-400 hover:bg-white/5",
              )}
            >
              <IconResolver name={item?.icon || "Sparkle"} className="w-5 h-5" />
              <span className="text-[9px] uppercase tracking-wider font-medium">
                {SLOT_LABELS[slot].split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Items grid */}
      <div className="space-y-2">
        {items.map((item, idx) => {
          const isOwned = owned.includes(item.id);
          const isEquipped = equippedId === item.id;
          const canAfford = nacklBalance >= item.cost;
          const colors = RARITY_COLORS[item.rarity];
          const prevItem = idx > 0 ? items[idx - 1] : null;
          const prevOwned = prevItem ? owned.includes(prevItem.id) : true;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={cn(
                "relative glass rounded-2xl p-3 border flex items-center gap-3",
                colors.border,
                isEquipped && "ring-1 ring-amber-400/50",
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "relative w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                  colors.bg,
                )}
              >
                <IconResolver
                  name={item.icon}
                  className={cn("w-7 h-7", colors.text)}
                  strokeWidth={1.5}
                />
                {item.tier > 1 && (
                  <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-zinc-900 border border-zinc-600 rounded-full w-4 h-4 flex items-center justify-center text-zinc-300">
                    {item.tier}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-sm font-bold", colors.text)}>
                    {item.name}
                  </span>
                  <span className={cn("text-[9px] uppercase tracking-wider font-semibold", colors.text, "opacity-70")}>
                    {RARITY_LABEL[item.rarity]}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                  {item.description}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px]">
                  {item.tapMultiplier > 1 && (
                    <span className="text-amber-300">×{item.tapMultiplier.toFixed(2)} taps</span>
                  )}
                  {item.rewardMultiplier > 1 && (
                    <span className="text-lime-300">×{item.rewardMultiplier.toFixed(2)} rewards</span>
                  )}
                  {item.cooldownReductionMs > 0 && (
                    <span className="text-cyan-300">-{(item.cooldownReductionMs / 1000).toFixed(1)}s cd</span>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="flex flex-col items-end gap-1">
                {isEquipped ? (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                    <Check className="w-3.5 h-3.5" />
                    Equipped
                  </div>
                ) : isOwned ? (
                  <button
                    onClick={() => handleEquip(item)}
                    className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-200 border border-cyan-400/30 hover:bg-cyan-500/25 transition-colors"
                  >
                    Equip
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={!canAfford || !prevOwned}
                    className={cn(
                      "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-colors",
                      canAfford && prevOwned
                        ? "bg-amber-500/15 text-amber-200 border-amber-400/30 hover:bg-amber-500/25"
                        : "bg-zinc-800/40 text-zinc-600 border-zinc-700/30 cursor-not-allowed",
                    )}
                  >
                    {!prevOwned ? (
                      <>
                        <Lock className="w-3 h-3" />
                        Locked
                      </>
                    ) : (
                      <>
                        <Coins className="w-3 h-3" />
                        {item.cost.toLocaleString()}
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function BonusStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="text-center">
      <div className={cn("text-lg font-bold tabular-nums", accent)}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}
