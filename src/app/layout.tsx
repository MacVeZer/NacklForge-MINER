import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NacklForge — Premium Mining App for Nackl Token",
  description:
    "NacklForge is a gamified on-chain mining app for the Nackl token. Tap to mine, upgrade your rig, complete quests, climb the leaderboard, and earn real on-chain rewards.",
  keywords: [
    "Nackl",
    "NacklForge",
    "Acki Nacki",
    "mining",
    "tap to earn",
    "crypto",
    "blockchain",
    "BEE",
  ],
  authors: [{ name: "NacklForge" }],
  openGraph: {
    title: "NacklForge — Premium Mining App for Nackl Token",
    description:
      "Tap to mine Nackl on-chain. Upgrade rigs, complete quests, climb the leaderboard.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NacklForge",
    description: "Premium mining app for Nackl token",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0b1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-center" />
      </body>
    </html>
  );
}
