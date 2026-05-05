"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const BronBooking = dynamic(
  () => import("./bron-booking").then((m) => m.BronBooking),
  { ssr: false },
);

export default function BronPage() {
  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-montserrat)] text-slate-900 antialiased">
      {/* Темний хедер узгоджений із головною — не «весь екран стає білим» одразу після переходу */}
      <header className="sticky top-0 z-50 border-b border-[#c9a962]/28 bg-[#0a0a0a]/95 shadow-[inset_0_-1px_0_rgba(201,169,98,0.08)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-start justify-between gap-2 px-4 py-3 sm:items-center sm:gap-6 sm:py-4 md:px-8">
          <div className="flex flex-col gap-0.5">
            <Link
              href="/"
              className="font-[family-name:var(--font-cormorant)] text-[22px] font-semibold leading-none tracking-[0.22em] text-[#f0ebe3] transition hover:text-[#c9a962] sm:text-lg sm:tracking-[0.32em] md:text-xl"
            >
              RIVERA
            </Link>
            <p className="mt-1 max-w-[170px] text-[10px] font-semibold uppercase leading-snug tracking-[0.18em] text-[#8a959c] sm:max-w-none sm:text-[11px] sm:tracking-[0.28em] md:text-[12px]">
              Дата візиту · карта місць · бронювання
            </p>
          </div>
          <nav>
            <Link
              href="/"
              className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-md border border-[#c9a962]/42 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#cfc7b8] transition hover:border-[#c9a962]/85 hover:bg-[#c9a962]/08 hover:text-[#f5f5dc] sm:px-3 sm:py-1.5 sm:text-[11px] sm:tracking-[0.24em]"
            >
              На головну
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1600px] px-4 pb-16 pt-5 sm:pt-8 md:px-8 md:pt-12">
        <BronBooking />
      </main>
    </div>
  );
}
