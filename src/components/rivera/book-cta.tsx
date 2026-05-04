"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type BookCtaProps = {
  className?: string;
};

/** Одна основна кнопка бронювання з дуже делікатним «диханням» і стрілкою */
export function BookCta({ className = "" }: BookCtaProps) {
  return (
    <motion.div
      className={`inline-flex ${className}`}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.95, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={{ opacity: [0.92, 1, 0.92] }}
        transition={{
          repeat: Infinity,
          duration: 4.2,
          ease: "easeInOut",
        }}
      >
        <Link
          href="/bron"
          className="group inline-flex items-center gap-3 border border-[#c9a962]/90 px-7 py-3 text-[11px] font-medium uppercase tracking-[0.3em] text-[#f5f5dc] shadow-[0_0_0_1px_rgba(201,169,98,0.08)_inset] transition hover:bg-[#c9a962]/14 md:gap-4 md:px-8 md:py-3.5 md:text-xs"
        >
          <span className="md:tracking-[0.32em]">Забронювати</span>
          <motion.span
            className="inline-block text-[#c9a962]"
            aria-hidden
            animate={{ x: [0, 3, 0] }}
            transition={{
              repeat: Infinity,
              duration: 3.5,
              ease: "easeInOut",
            }}
          >
            →
          </motion.span>
        </Link>
      </motion.div>
    </motion.div>
  );
}
