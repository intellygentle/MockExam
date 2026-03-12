"use client";

import Link from "next/link";
import BadgeChip from "@/components/BadgeChip";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, ShieldUser } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-10 text-center">
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="card w-full max-w-4xl space-y-6 text-center shadow-2xl backdrop-blur-md rounded-[2.5rem] p-8 sm:p-12 border-white/20 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-policeGreen via-policeGold to-policeRed"></div>
        
        <p className="text-xs sm:text-sm uppercase tracking-[0.5em] text-white/60 font-semibold">
          Final Screening Preparation
        </p>
        
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-policeGold leading-tight">
          Think You Have <br /> What It Takes?
        </h2>
        
        <p className="text-white/80 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Daily mocks, instant feedback, recruit badges, and funny WhatsApp stickers to keep you smiling when the pressure hits.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <Link 
            href="/practice" 
            className="flex items-center gap-2 rounded-full bg-policeGold px-8 py-4 font-bold uppercase tracking-[0.3em] text-policeBlue transition hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,215,0,0.3)] w-full sm:w-auto justify-center"
          >
            Start Practice <ArrowRight size={20} />
          </Link>
          <Link 
            href="/leaderboard" 
            className="flex items-center gap-2 rounded-full border border-white/30 bg-white/5 backdrop-blur px-8 py-4 font-bold uppercase tracking-[0.3em] text-white hover:bg-white/10 transition w-full sm:w-auto justify-center"
          >
            <Trophy size={18} /> Rankings
          </Link>
        </div>
      </motion.section>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="flex flex-col items-center gap-4 mt-8"
      >
        <p className="text-sm text-white/50 uppercase tracking-widest flex items-center gap-2">
          <ShieldUser size={16} /> Earn Ranks as you go
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <BadgeChip label="Rookie" earned />
          <BadgeChip label="Detective" earned={false} />
          <BadgeChip label="Sharp Shooter" earned={false} />
        </div>
      </motion.div>
    </div>
  );
}