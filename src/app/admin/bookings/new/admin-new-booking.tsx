"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { PoolMap } from "@/components/pool-map/pool-map";
import { formatSeatLineUk } from "@/lib/pool/seat-pricing";
import { createAdminBooking } from "../actions";

type Status =
  | { kind: "idle" }
  | { kind: "ok"; count: number }
  | { kind: "error"; message: string };

/** `todayKey` — канонічне «сьогодні» (Europe/Kyiv) із сервера: єдине джерело, без SSR-мисматчу. */
export function AdminNewBooking({ todayKey }: { todayKey: string }) {
  const [visitDateKey, setVisitDateKey] = useState<string>(todayKey);
  const [selectedSeats, setSelectedSeats] = useState<Record<string, boolean>>({});
  const [bookedSeatIds, setBookedSeatIds] = useState<Record<string, boolean>>({});
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();
  const prevDateRef = useRef<string>(visitDateKey);

  const refreshBooked = useCallback((dateKey: string) => {
    let cancelled = false;
    fetch(`/api/booking/occupied-seats?date=${encodeURIComponent(dateKey)}`)
      .then((r) => r.json())
      .then((d: { seatIds?: string[] }) => {
        if (cancelled) return;
        const o: Record<string, boolean> = {};
        for (const id of d.seatIds ?? []) o[id] = true;
        setBookedSeatIds(o);
      })
      .catch(() => {
        if (!cancelled) setBookedSeatIds({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Скидаємо вибір при зміні дня та підвантажуємо зайняті місця.
  useEffect(() => {
    if (!visitDateKey) {
      const t = window.setTimeout(() => setBookedSeatIds({}), 0);
      return () => window.clearTimeout(t);
    }
    if (prevDateRef.current !== visitDateKey) {
      prevDateRef.current = visitDateKey;
      setSelectedSeats({});
      setStatus({ kind: "idle" });
    }
    return refreshBooked(visitDateKey);
  }, [visitDateKey, refreshBooked]);

  const onSeatToggle = useCallback(
    (seatId: string) => {
      const currentlySelected = Boolean(selectedSeats[seatId]);
      if (!currentlySelected && bookedSeatIds[seatId]) return;
      setSelectedSeats((prev) => ({ ...prev, [seatId]: !prev[seatId] }));
    },
    [bookedSeatIds, selectedSeats],
  );

  const selectedSeatIds = useMemo(
    () =>
      Object.entries(selectedSeats)
        .filter(([, on]) => on)
        .map(([id]) => id)
        .sort((a, b) => a.localeCompare(b, "uk")),
    [selectedSeats],
  );

  const submit = useCallback(() => {
    if (pending) return;
    if (selectedSeatIds.length === 0) {
      setStatus({ kind: "error", message: "Оберіть хоча б одне місце на карті" });
      return;
    }
    startTransition(async () => {
      const res = await createAdminBooking({
        visitDateKey,
        seatIds: selectedSeatIds,
        fullName,
        phone,
        details,
      });
      if (res.ok) {
        setStatus({ kind: "ok", count: selectedSeatIds.length });
        setSelectedSeats({});
        setFullName("");
        setPhone("");
        setDetails("");
        refreshBooked(visitDateKey);
      } else {
        setStatus({ kind: "error", message: res.error });
        if (res.clashSeatIds?.length) {
          // Прибираємо зайняті з вибору й оновлюємо карту.
          setSelectedSeats((prev) => {
            const next = { ...prev };
            for (const id of res.clashSeatIds ?? []) delete next[id];
            return next;
          });
          refreshBooked(visitDateKey);
        }
      }
    });
  }, [pending, selectedSeatIds, visitDateKey, fullName, phone, details, refreshBooked]);

  return (
    <div className="space-y-8 font-[family-name:var(--font-montserrat)]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-zinc-900">
            Нова бронь без оплати
          </h1>
          <p className="mt-1 text-sm font-medium text-zinc-600">
            Оберіть день і клікніть вільні місця на карті. Місця закріпляться
            одразу, без оплати.
          </p>
        </div>
        <Link
          href="/admin/bookings"
          className="rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-teal-600 hover:text-teal-800"
        >
          ← До списку заявок
        </Link>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-6">
        <div className="order-1 min-w-0 w-full lg:flex-[7] lg:basis-0">
          <PoolMap
            wideLayout
            resortChrome
            visitDateKey={visitDateKey || undefined}
            selectedSeats={selectedSeats}
            onSeatToggle={onSeatToggle}
            bookedSeatIds={bookedSeatIds}
            showOccupancyLegend
          />
        </div>

        <aside className="order-2 w-full min-w-0 space-y-5 lg:sticky lg:top-28 lg:flex-[3] lg:basis-0">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="admin-visit-date"
                className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
              >
                Дата візиту
              </label>
              <input
                id="admin-visit-date"
                type="date"
                value={visitDateKey}
                min={todayKey}
                onChange={(e) => setVisitDateKey(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-teal-600"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="admin-name"
                className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
              >
                Ім&apos;я (необов&apos;язково)
              </label>
              <input
                id="admin-name"
                type="text"
                value={fullName}
                maxLength={200}
                placeholder="Бронь адміністратора"
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="admin-phone"
                className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
              >
                Телефон (необов&apos;язково)
              </label>
              <input
                id="admin-phone"
                type="tel"
                value={phone}
                maxLength={32}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="admin-details"
                className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
              >
                Нотатка (необов&apos;язково)
              </label>
              <textarea
                id="admin-details"
                value={details}
                maxLength={2000}
                rows={2}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600"
              />
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Обрано місць: {selectedSeatIds.length}
              </p>
              {selectedSeatIds.length > 0 ? (
                <p className="mt-1 text-xs leading-snug text-zinc-700">
                  {selectedSeatIds.map(formatSeatLineUk).join(", ")}
                </p>
              ) : (
                <p className="mt-1 text-xs text-zinc-500">
                  Клікніть вільні місця на карті.
                </p>
              )}
            </div>

            {status.kind === "ok" ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                Заброньовано {status.count} місць без оплати.
              </p>
            ) : null}
            {status.kind === "error" ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                {status.message}
              </p>
            ) : null}

            <button
              type="button"
              onClick={submit}
              disabled={pending || selectedSeatIds.length === 0}
              className="w-full rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Зберігаю…" : "Забронювати без оплати"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
