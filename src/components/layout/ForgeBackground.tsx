"use client";

import { motion } from "framer-motion";

export function ForgeBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden forge-bg pointer-events-none">
      {/* Radial glow orbs */}
      <motion.div
        className="absolute -top-32 -left-24 w-96 h-96 rounded-full"
        style={{
          background:
            "radial-gradient(circle, oklch(0.78 0.2 70 / 18%) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
        animate={{
          x: [0, 30, 0],
          y: [0, 20, 0],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full"
        style={{
          background:
            "radial-gradient(circle, oklch(0.7 0.18 195 / 15%) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
        animate={{
          x: [0, -40, 0],
          y: [0, -30, 0],
          opacity: [0.5, 0.85, 0.5],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full"
        style={{
          background:
            "radial-gradient(circle, oklch(0.65 0.24 330 / 12%) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
        animate={{
          x: [0, 20, 0],
          y: [0, -25, 0],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Grid overlay */}
      <div className="absolute inset-0 forge-grid opacity-60" />

      {/* Subtle noise/vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, oklch(0.08 0.02 280 / 70%) 100%)",
        }}
      />
    </div>
  );
}
