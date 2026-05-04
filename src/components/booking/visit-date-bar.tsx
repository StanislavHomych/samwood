"use client";

import { motion } from "framer-motion";

export function formatVisitDateUa(d: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

type VisitDateBarProps = {
  date: Date;
  onPrevDay: () => void;
  onNextDay: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
};

export function VisitDateBar({
  date,
  onPrevDay,
  onNextDay,
  canGoPrev,
  canGoNext,
}: VisitDateBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-stretch gap-1 rounded-2xl border border-[#1f2f3a]/16 bg-[#d6e2e9] px-1.5 py-3 shadow-[0_12px_32px_-16px_rgba(8,14,22,0.28),inset_0_1px_0_rgba(255,255,255,0.42)] sm:gap-2 sm:px-2"
    >
      <button
        type="button"
        onClick={onPrevDay}
        disabled={!canGoPrev}
        aria-label="Попередній день"
        className={[
          "flex w-11 shrink-0 items-center justify-center rounded-lg border text-lg leading-none transition sm:w-12",
          canGoPrev
            ? "border-teal-900/35 text-teal-950 hover:bg-teal-950/10"
            : "cursor-not-allowed border-[#2a3944]/22 text-[#64727a]",
        ].join(" ")}
      >
        ‹
      </button>

      <div className="min-w-0 flex-1 px-1 text-left sm:px-2">
        <p className="font-[family-name:var(--font-cormorant)] text-[9px] font-semibold uppercase tracking-[0.32em] text-teal-800">
          Дата візиту
        </p>
        <p className="mt-1.5 font-[family-name:var(--font-montserrat)] text-[12px] font-semibold capitalize leading-snug text-[#152026] sm:text-[13px]">
          {formatVisitDateUa(date)}
        </p>
      </div>

      <button
        type="button"
        onClick={onNextDay}
        disabled={!canGoNext}
        aria-label="Наступний день"
        className={[
          "flex w-11 shrink-0 items-center justify-center rounded-lg border text-lg leading-none transition sm:w-12",
          canGoNext
            ? "border-teal-900/35 text-teal-950 hover:bg-teal-950/10"
            : "cursor-not-allowed border-[#2a3944]/22 text-[#64727a]",
        ].join(" ")}
      >
        ›
      </button>
    </motion.div>
  );
}
