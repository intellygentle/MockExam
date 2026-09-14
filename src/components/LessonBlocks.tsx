"use client";

import { BadgeCheck, CheckCircle2, Sparkles } from "lucide-react";

/**
 * A structured block of a lesson / rules note.
 * Rendered by LessonCard (left pane), the Rules study screen and the
 * in-drill rules reference panel.
 */
export type LessonBlock = {
  kind: "heading" | "subheading" | "text" | "bullets" | "examples" | "collapsible" | "review" | "table";
  text?: string;
  items?: string[];
  title?: string;
  headers?: string[];
  rows?: string[][];
};

export default function LessonBlocks({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "heading":
            return (
              <h3 key={i} className="pt-2 text-base font-heading font-bold text-policeGold tracking-tight border-t border-white/10">
                {block.text}
              </h3>
            );
          case "subheading":
            return (
              <h4 key={i} className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                {block.text}
              </h4>
            );
          case "text":
            return (
              <p key={i} className="text-sm text-white/70 leading-relaxed">
                {block.text}
              </p>
            );
          case "bullets":
            return (
              <ul key={i} className="space-y-2">
                {(block.items || []).map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-white/80 leading-relaxed">
                    <span className="w-2 h-2 rounded-full bg-policeGold shrink-0 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          case "examples":
            return (
              <div key={i} className="bg-policeGold/5 border border-policeGold/20 rounded-2xl p-4 space-y-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-policeGold font-semibold">{block.title}</p>
                <div className="space-y-1.5">
                  {(block.items || []).map((item, j) => (
                    <p key={j} className="text-sm text-white/85 leading-relaxed italic">“{item}”</p>
                  ))}
                </div>
              </div>
            );
          case "collapsible":
            return (
              <details key={i} className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <summary className="cursor-pointer select-none flex items-center justify-between px-4 py-3 text-xs font-bold text-white/80 hover:bg-white/5 transition list-none">
                  <span className="flex items-center gap-2">
                    <Sparkles size={13} className="text-policeGold" /> {block.title}
                  </span>
                  <span className="text-white/40 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <ul className="px-4 pb-4 space-y-1.5 border-t border-white/10 pt-3">
                  {(block.items || []).map((item, j) => (
                    <li key={j} className="text-[13px] text-white/70 leading-relaxed flex items-start gap-2">
                      <span className="text-policeGold shrink-0">•</span> {item}
                    </li>
                  ))}
                </ul>
              </details>
            );
          case "review":
            return (
              <div key={i} className="bg-policeGreen/10 border border-policeGreen/25 rounded-2xl p-4 space-y-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-policeGreen font-semibold flex items-center gap-1.5">
                  <BadgeCheck size={12} /> {block.title}
                </p>
                <ul className="space-y-1.5">
                  {(block.items || []).map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-white/85 leading-relaxed">
                      <CheckCircle2 size={14} className="text-policeGreen shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          case "table":
            return (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/15">
                        {(block.headers || []).map((h, j) => (
                          <th key={j} className="py-2 pr-3 text-[9px] uppercase tracking-widest text-white/60 font-bold whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(block.rows || []).map((row, j) => (
                        <tr key={j} className="border-b border-white/5 last:border-0">
                          {row.map((cell, k) => (
                            <td key={k} className={`py-2 pr-3 leading-relaxed align-top ${k === 0 ? "font-semibold text-white/90 whitespace-nowrap" : "text-white/70"}`}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
