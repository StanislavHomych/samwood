"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { BookingSidePanel } from "@/components/booking/booking-side-panel";
import { LuxuryDatePicker } from "@/components/booking/luxury-date-picker";
import { VisitDateBar } from "@/components/booking/visit-date-bar";
import { PoolMap } from "@/components/pool-map/pool-map";

function stripTime(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function BronBooking() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  /** Спочатку календар відкритий; «Змінити дату» лише відкриває його знов — дата не стирається */
  const [calendarOpen, setCalendarOpen] = useState(true);

  const dateLockedIn = selectedDate !== null && !calendarOpen;

  const shiftVisitDay = useCallback((delta: number) => {
    setSelectedDate((prev) => {
      if (!prev) return prev;
      const todayStart = stripTime(new Date());
      const maxEnd = stripTime(new Date());
      maxEnd.setFullYear(maxEnd.getFullYear() + 2);
      const next = stripTime(prev);
      next.setDate(next.getDate() + delta);
      const t = next.getTime();
      if (t < todayStart.getTime()) return prev;
      if (t > maxEnd.getTime()) return prev;
      return next;
    });
  }, []);

  const todayStart = stripTime(new Date());
  const maxBookEnd = stripTime(new Date());
  maxBookEnd.setFullYear(maxBookEnd.getFullYear() + 2);
  const visitNav =
    selectedDate !== null
      ? {
          canGoPrev: stripTime(selectedDate).getTime() > todayStart.getTime(),
          canGoNext: stripTime(selectedDate).getTime() < maxBookEnd.getTime(),
        }
      : { canGoPrev: false, canGoNext: false };

  const commitDate = useCallback((d: Date) => {
    setSelectedDate(stripTime(d));
    setCalendarOpen(false);
  }, []);

  const openCalendar = useCallback(() => setCalendarOpen(true), []);

  useEffect(() => {
    if (!calendarOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
    };
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = "";
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [calendarOpen]);

  return (
    <div className="relative isolate min-h-[calc(100dvh-10rem)]">
      {/* Карта + колона — активні лише після закриття календаря з обраною датою */}
      <div
        className={`flex flex-col gap-8 transition-[opacity,filter] duration-700 ease-out lg:flex-row lg:items-start lg:gap-6 ${dateLockedIn ? "opacity-100" : "pointer-events-none opacity-35 saturate-75 blur-[2px]"}`}
        aria-hidden={!dateLockedIn}
      >
        <div className="order-1 flex min-h-[360px] min-w-0 w-full flex-col gap-4 lg:flex-[7] lg:basis-0">
          {dateLockedIn && selectedDate ? (
            <VisitDateBar
              date={selectedDate}
              onPrevDay={() => shiftVisitDay(-1)}
              onNextDay={() => shiftVisitDay(1)}
              canGoPrev={visitNav.canGoPrev}
              canGoNext={visitNav.canGoNext}
            />
          ) : null}
          <PoolMap wideLayout resortChrome />
        </div>

        <aside
          className={`order-2 flex w-full min-w-0 flex-col gap-5 lg:sticky lg:top-28 lg:max-h-[calc(100vh-7rem)] lg:flex-[3] lg:basis-0 lg:overscroll-contain ${dateLockedIn ? "lg:overflow-y-auto" : "overflow-hidden lg:overflow-hidden"}`}
        >
          {dateLockedIn ? (
            <BookingSidePanel
              selectedDate={selectedDate}
              onEditDate={openCalendar}
            />
          ) : (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#1a2830]/20 bg-[#d3dde3]/92 px-6 py-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
              <p className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-[#1a2429]">
                Бронювання
              </p>
              <p className="mt-3 max-w-[240px] text-[13px] font-medium leading-relaxed text-[#2d3b44]">
                Спочатку оберіть день у календарі — з&apos;являться карта та форма бронювання.
              </p>
            </div>
          )}
        </aside>
      </div>

      <AnimatePresence>
        {calendarOpen && (
          <motion.div
            key="date-gate"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bron-date-heading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center overflow-hidden overscroll-none px-3 py-3 sm:px-5 sm:py-6 lg:absolute lg:inset-0 lg:z-[35] lg:p-4"
          >
            <div className="absolute inset-0 bg-[#070b0f]/52 backdrop-blur-md lg:rounded-sm" />

            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.99 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 flex w-full max-w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-[#1f2e38]/28 bg-[#dce6ea] shadow-[0_26px_64px_-22px_rgba(7,12,18,0.45)] ring-1 ring-white/35 max-h-[min(calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)),92dvh)]"
            >
              <div className="shrink-0 border-b border-[#2a3944]/14 bg-[linear-gradient(160deg,#c8d9e0_0%,#dae5ea_52%,#e2eaf0_100%)] px-4 py-3 text-center sm:px-5">
                <p
                  id="bron-date-heading"
                  className="font-[family-name:var(--font-cormorant)] text-[9px] font-semibold uppercase tracking-[0.3em] text-teal-900"
                >
                  Rivera · дата візиту
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-cormorant)] text-xl font-semibold leading-snug text-[#152025]">
                  {selectedDate
                    ? "Змінити або підтвердити день"
                    : "Оберіть день відвідання"}
                </h2>
                <p className="mx-auto mt-1.5 max-w-[300px] text-[11px] font-medium leading-snug text-[#374854]">
                  Повторний клік по даті закриває це вікно.
                </p>
              </div>

              <div className="shrink-0 overflow-hidden px-3 pb-2 pt-2 sm:px-4 sm:pb-2.5">
                <LuxuryDatePicker
                  variant="resort"
                  compact
                  embedded
                  value={selectedDate}
                  onChange={commitDate}
                />
              </div>

              {selectedDate && (
                <div className="shrink-0 border-t border-[#2a3944]/12 bg-[#cfdae1]/72 px-4 py-2 text-center sm:px-5 sm:py-2.5">
                  <button
                    type="button"
                    onClick={() => setCalendarOpen(false)}
                    className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3f4f59] transition hover:text-teal-900"
                  >
                    Закрити без змін
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
