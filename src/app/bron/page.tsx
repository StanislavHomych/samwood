import { BronBooking } from "./bron-booking";
import Link from "next/link";

export default function BronPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(175deg,#c5d3da_0%,#aab9c2_36%,#9dadb8_72%,#95a8b5_100%)] font-[family-name:var(--font-montserrat)] text-[#1a2429] antialiased">
      {/* Темний хедер узгоджений із головною — не «весь екран стає білим» одразу після переходу */}
      <header className="sticky top-0 z-50 border-b border-[#c9a962]/28 bg-[#0a0a0a]/95 shadow-[inset_0_-1px_0_rgba(201,169,98,0.08)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-4 py-4 md:px-8">
          <div className="flex flex-col gap-0.5">
            <Link
              href="/"
              className="font-[family-name:var(--font-cormorant)] text-lg font-semibold tracking-[0.32em] text-[#f0ebe3] transition hover:text-[#c9a962] md:text-xl"
            >
              RIVERA
            </Link>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8a959c] md:text-[12px]">
              Дата візиту · карта місць · бронювання
            </p>
          </div>
          <nav>
            <Link
              href="/"
              className="rounded-md border border-[#c9a962]/42 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#cfc7b8] transition hover:border-[#c9a962]/85 hover:bg-[#c9a962]/08 hover:text-[#f5f5dc]"
            >
              На головну
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1600px] px-4 pb-16 pt-8 md:px-8 md:pt-12">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.55]"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 72% 48% at 22% -6%, rgba(13,148,136,0.11) 0%, transparent 50%), radial-gradient(ellipse 52% 36% at 88% 4%, rgba(201,169,98,0.07) 0%, transparent 48%)",
          }}
        />
        <BronBooking />
      </main>
    </div>
  );
}
