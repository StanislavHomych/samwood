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
      className="flex items-stretch gap-1 overflow-hidden rounded-2xl border border-slate-200/90 bg-white px-1.5 py-3 shadow-sm sm:gap-2 sm:px-2"
    >
      <button
        type="button"
        onClick={onPrevDay}
        disabled={!canGoPrev}
        aria-label="Попередній день"
        className={[
          "flex w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg leading-none transition sm:w-12",
          canGoPrev
            ? "text-slate-800 hover:bg-slate-50 hover:border-slate-300"
            : "cursor-not-allowed border-slate-100 text-slate-300",
        ].join(" ")}
      >
        ‹
      </button>

      <div className="min-w-0 flex-1 px-1 text-left sm:px-2">
        <p className="font-[family-name:var(--font-montserrat)] text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-600">
          Дата візиту
        </p>
        <p className="mt-1.5 font-[family-name:var(--font-montserrat)] text-[12px] font-semibold capitalize leading-snug text-slate-900 sm:text-[13px]">
          {formatVisitDateUa(date)}
        </p>
      </div>

      <button
        type="button"
        onClick={onNextDay}
        disabled={!canGoNext}
        aria-label="Наступний день"
        className={[
          "flex w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg leading-none transition sm:w-12",
          canGoNext
            ? "text-slate-800 hover:bg-slate-50 hover:border-slate-300"
            : "cursor-not-allowed border-slate-100 text-slate-300",
        ].join(" ")}
      >
        ›
      </button>
    </motion.div>
  );
}
