"use client";

type Props = {
  label: string;
  earned: boolean;
};

/**
 * Tiny badge indicator for the badge grid.
 * Shows a gold badge when earned, otherwise locked.
 */
export default function BadgeChip({ label, earned }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] transition 
        ${earned 
          ? "bg-policeGold text-black" 
          : "bg-white/10 text-white/60"
        }`}
    >
      {earned ? "🏅" : "🔒"} {label}
    </span>
  );
}
