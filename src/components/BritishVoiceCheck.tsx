"use client";

import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, Headphones, Loader2, Play } from "lucide-react";
import type { useBritishVoice } from "@/lib/useBritishVoice";

/**
 * Voice check screen shown before the first Word Vault activity (spec 3.2).
 * It plays a test sentence in the chosen voice, lets the student pick another
 * British voice, and refuses to continue when no en-GB voice is installed.
 */
const TEST_SENTENCE =
  "The teacher checks every answer carefully. Listen to the word, then type it from memory.";

export default function BritishVoiceCheck({
  voice,
  title = "Check your British voice",
  onContinue,
  onBack,
}: {
  voice: ReturnType<typeof useBritishVoice>;
  title?: string;
  onContinue: () => void;
  onBack: () => void;
}) {
  if (!voice.supported) {
    return (
      <div className="max-w-xl mx-auto py-10 px-4">
        <div className="card border border-policeRed/30 bg-policeRed/5 space-y-3 text-center">
          <AlertTriangle className="mx-auto text-policeRed" />
          <h2 className="font-heading font-bold text-white">This browser cannot speak</h2>
          <p className="text-sm text-white/60">
            Your browser does not support speech synthesis, so the listening activities cannot run
            here. Please open the site in a modern browser such as Chrome, Edge or Safari.
          </p>
          <button onClick={onBack} className="px-5 py-2.5 rounded-xl bg-white/10 text-white/80 font-bold text-sm hover:bg-white/20 transition">
            <ArrowLeft size={15} className="inline mr-1.5" /> Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-6 px-3 sm:px-0">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 bg-sky-500/10 rounded-full border border-sky-500/20">
            <Headphones size={34} className="text-sky-300" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-white">🇬🇧 {title}</h2>
          <p className="text-sm text-white/60">
            Turn your sound on. Every sentence is read in British English — make sure your device has
            a British voice before you start.
          </p>
        </div>

        {voice.hasVoice ? (
          <div className="space-y-3">
            <button
              onClick={() => voice.speak(TEST_SENTENCE, { rate: 0.9 })}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 text-white font-bold hover:brightness-110 transition text-sm"
            >
              <Play size={16} /> Play a test sentence
            </button>

            {voice.britishVoices.length > 1 && (
              <label className="block text-left">
                <span className="text-[10px] uppercase tracking-widest text-white/40">
                  British voice
                </span>
                <select
                  value={voice.voice?.voiceURI || ""}
                  onChange={(e) => {
                    const picked = voice.britishVoices.find((v) => v.voiceURI === e.target.value);
                    if (picked) voice.setVoice(picked);
                  }}
                  className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
                >
                  {voice.britishVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI} className="bg-[#0b1220]">
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <p className="text-xs text-white/50 text-center">
              Using <span className="text-sky-300 font-semibold">{voice.voice?.name}</span>. If a word
              sounds wrong, pick a different British voice above.
            </p>
          </div>
        ) : (
          <div className="bg-policeRed/10 border border-policeRed/30 rounded-xl p-4 space-y-2">
            <p className="text-sm font-bold text-policeRed">No British voice was found on this device</p>
            <p className="text-xs text-white/60">
              Install an English (United Kingdom) voice in your system settings (or try Chrome, Edge
              or Safari), then reload this page. The activity will not run with a non-British accent.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onBack}
            className="py-3 rounded-xl bg-white/10 text-white/80 font-bold hover:bg-white/20 transition text-sm border border-white/10"
          >
            <ArrowLeft size={15} className="inline mr-1.5" /> Back
          </button>
          <button
            onClick={() => {
              if (!voice.hasVoice) return;
              voice.cancel();
              onContinue();
            }}
            disabled={!voice.hasVoice}
            className="py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {voice.hasVoice ? "Start" : <><Loader2 size={15} className="animate-spin" /> Waiting…</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
