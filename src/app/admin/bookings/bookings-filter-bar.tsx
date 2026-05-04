"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

const PAYMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Усі способи" },
  { value: "cash", label: "Готівка" },
  { value: "on_site", label: "Термінал / на місці" },
  { value: "monobank", label: "Monobank" },
];

type Props = {
  defaultDate: string;
  defaultPayment: string;
  clearDateHref: string;
  clearPaymentHref: string;
  showClearDate: boolean;
  showClearPayment: boolean;
};

export function BookingsFilterBar({
  defaultDate,
  defaultPayment,
  clearDateHref,
  clearPaymentHref,
  showClearDate,
  showClearPayment,
}: Props) {
  const [payment, setPayment] = useState(defaultPayment);
  const [listOpen, setListOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    setPayment(defaultPayment);
  }, [defaultPayment]);

  useEffect(() => {
    if (!listOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setListOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setListOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [listOpen]);

  const activeLabel =
    PAYMENT_OPTIONS.find((o) => o.value === payment)?.label ?? "Усі способи";

  return (
    <form
      method="get"
      action="/admin/bookings"
      className="flex max-w-full flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end sm:gap-3"
    >
      <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-600 sm:flex-row sm:items-center sm:gap-2">
        <span className="shrink-0 sm:pt-0">Дата візиту</span>
        <input
          type="date"
          name="date"
          defaultValue={defaultDate}
          className="h-10 w-full min-w-[10.5rem] max-w-[11.5rem] rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 [color-scheme:light]"
        />
      </label>

      <div
        ref={rootRef}
        className="relative flex min-w-0 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-600 sm:min-w-[11rem] sm:max-w-[14rem]"
      >
        <span className="shrink-0 sm:pt-0">Оплата</span>
        <input type="hidden" name="payment" value={payment} />
        <button
          type="button"
          className="flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-left text-sm font-medium normal-case tracking-normal text-zinc-900 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50"
          aria-expanded={listOpen}
          aria-haspopup="listbox"
          aria-controls={listId}
          onClick={() => setListOpen((v) => !v)}
        >
          <span className="truncate">{activeLabel}</span>
          <span
            className={`shrink-0 text-zinc-500 transition ${listOpen ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▾
          </span>
        </button>
        {listOpen ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg ring-1 ring-zinc-900/5"
          >
            {PAYMENT_OPTIONS.map((opt) => {
              const selected = payment === opt.value;
              return (
                <li key={opt.value || "all"} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={[
                      "flex w-full items-center px-3 py-2.5 text-left text-sm font-medium normal-case tracking-normal transition",
                      selected
                        ? "bg-teal-50 text-teal-950"
                        : "text-zinc-800 hover:bg-zinc-50",
                    ].join(" ")}
                    onClick={() => {
                      setPayment(opt.value);
                      setListOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="submit"
          className="h-10 shrink-0 rounded-lg border border-teal-800 bg-teal-700 px-4 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-teal-800"
        >
          Показати
        </button>
        {showClearDate ? (
          <Link
            href={clearDateHref}
            className="inline-flex h-10 shrink-0 items-center text-xs font-semibold text-teal-800 underline underline-offset-2"
          >
            Усі дати
          </Link>
        ) : null}
        {showClearPayment ? (
          <Link
            href={clearPaymentHref}
            className="inline-flex h-10 shrink-0 items-center text-xs font-semibold text-teal-800 underline underline-offset-2"
          >
            Усі способи оплати
          </Link>
        ) : null}
      </div>
    </form>
  );
}
