"use client";

import Link from "next/link";
import BadgeChip from "@/components/BadgeChip";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, GraduationCap, BookOpen } from "lucide-react";

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
          JSS3 & SS3 Mock Exam Practice
        </p>
        
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-policeGold leading-tight">
          Ready to Ace <br /> Your Exams?
        </h2>
        
        <p className="text-white/80 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Fun mock questions, instant feedback, cool badges, and progress tracking to help you prepare for your exams with a smile.
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
            <Trophy size={18} /> Leaderboard
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
          <GraduationCap size={16} /> Earn Badges as you learn
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <BadgeChip label="Rising Star" earned />
          <BadgeChip label="Bookworm" earned={false} />
          <BadgeChip label="Brain Box" earned={false} />
        </div>
      </motion.div>

      {/* Quick links to levels */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-4xl"
      >
        <Link href="/practice?level=jss3" className="card hover:border-policeGold/50 transition group text-left">
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-policeGreen/20 p-3 rounded-full text-policeGreen group-hover:scale-110 transition-transform">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="text-xl font-heading font-bold text-white">JSS3</h3>
              <p className="text-xs text-white/50 uppercase tracking-widest">Junior Secondary</p>
            </div>
          </div>
          <p className="text-sm text-white/60">Practice questions for Junior Secondary School 3 students preparing for Basic Education exams.</p>
        </Link>

        <Link href="/practice?level=ss3" className="card hover:border-policeGold/50 transition group text-left">
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-policeGold/20 p-3 rounded-full text-policeGold group-hover:scale-110 transition-transform">
              <GraduationCap size={24} />
            </div>
            <div>
              <h3 className="text-xl font-heading font-bold text-white">SS3</h3>
              <p className="text-xs text-white/50 uppercase tracking-widest">Senior Secondary</p>
            </div>
          </div>
          <p className="text-sm text-white/60">Practice questions for Senior Secondary School 3 students preparing for WAEC, NECO, and other exams.</p>
        </Link>
      </motion.div>
    </div>
  );
}