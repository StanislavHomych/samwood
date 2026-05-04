"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const UK_MONTHS = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
];

const UK_DOW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function stripTime(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

type LuxuryDatePickerProps = {
  value: Date | null;
  onChange: (date: Date) => void;
  /** Вузька колонка: менший заголовок і сітка, без «важкого» hero */
  compact?: boolean;
  /** Усередині модалки: без дубля «дата візиту», мінімальні поля — щоб усе влізло в екран */
  embedded?: boolean;
  /** Світла «курортна» палітра (бронювання Rivera) або темний luxury */
  variant?: "noir" | "resort";
};

export function LuxuryDatePicker({
  value,
  onChange,
  compact = false,
  embedded = false,
  variant = "noir",
}: LuxuryDatePickerProps) {
  const resort = variant === "resort";
  /** У курортному /bron — один шрифт (Montserrat); noir лишається Cormorant. */
  const hf = resort
    ? "font-[family-name:var(--font-montserrat)]"
    : "font-[family-name:var(--font-cormorant)]";
  const today = useMemo(() => stripTime(new Date()), []);
  const [cursor, setCursor] = useState(() =>
    stripTime(value ?? new Date()),
  );

  useEffect(() => {
    if (value) setCursor(stripTime(value));
  }, [value]);

  const { year, month } = {
    year: cursor.getFullYear(),
    month: cursor.getMonth(),
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDowMonday = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells = useMemo(() => {
    const out: ({ day: number; date: Date } | null)[] = [];
    for (let i = 0; i < firstDowMonday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({
        day: d,
        date: new Date(year, month, d),
      });
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [year, month, daysInMonth, firstDowMonday]);

  const sel = value ? ymd(stripTime(value)) : "";

  function prevMonth() {
    setCursor(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCursor(new Date(year, month + 1, 1));
  }

  function isDisabled(d: Date) {
    return stripTime(d).getTime() < today.getTime();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: compact ? 8 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: compact ? 0.4 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "overflow-hidden rounded-xl border shadow-[inset_0_1px_0_rgba(201,169,98,0.06)]",
        resort
          ? embedded
            ? "rounded-lg border-slate-200 bg-white p-2 shadow-sm sm:p-2.5"
            : compact
              ? "border-slate-200 bg-white p-3.5 shadow-sm"
              : "rounded-2xl border-slate-200 bg-white p-6 shadow-sm md:p-8"
          : embedded
            ? "border-[#c9a962]/14 bg-[#12110f]/90 p-2 shadow-none sm:p-2.5"
            : compact
              ? "border-[#c9a962]/18 bg-gradient-to-br from-[#141210] via-[#10100e] to-[#0c0b0a] p-3.5 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.75)]"
              : "rounded-2xl border-[#c9a962]/22 bg-gradient-to-br from-[#141210] via-[#10100e] to-[#0c0b0a] p-6 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(201,169,98,0.08)] md:p-8",
      ].join(" ")}
    >
      {!compact && (
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className={[
                hf,
                "text-[11px] uppercase tracking-[0.45em]",
                resort ? "font-semibold text-slate-600" : "text-[#c9a962]/80",
              ].join(" ")}
            >
              Візит
            </p>
            <h2
              className={[
                "mt-1 text-2xl md:text-3xl",
                hf,
                resort ? "font-semibold text-slate-900" : "font-light text-[#f5f5dc]",
              ].join(" ")}
            >
              Оберіть дату
            </h2>
          </div>
          <p
            className={[
              "max-w-sm text-[12px] leading-relaxed",
              resort ? `${hf} font-medium text-slate-600` : "font-light text-[#8a877d]",
            ].join(" ")}
          >
            Після вибору з&apos;явиться форма бронювання праворуч — ім&apos;я, телефон і спосіб оплати.
          </p>
        </div>
      )}

      {compact && !embedded && (
        <div
          className={[
            "mb-3 border-b pb-2.5",
            resort ? "border-slate-200" : "border-[#c9a962]/10",
          ].join(" ")}
        >
          <p
            className={[
              hf,
              "text-[9px] uppercase tracking-[0.35em]",
              resort ? "font-semibold text-slate-600" : "text-[#c9a962]/65",
            ].join(" ")}
          >
            Дата візиту
          </p>
        </div>
      )}

      <div
        className={[
          "flex items-center justify-between gap-2 border-b",
          resort ? "border-slate-200" : "border-[#c9a962]/12",
          embedded ? "pb-2" : compact ? "pb-3" : "gap-4 pb-5",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={prevMonth}
          className={[
            "flex items-center justify-center rounded-lg border transition",
            resort
              ? "border-slate-200 text-slate-800 hover:bg-slate-50"
              : "border-[#c9a962]/25 text-[#c9a962] hover:bg-[#c9a962]/12",
            embedded
              ? "h-7 w-7 text-xs"
              : compact
                ? "h-8 w-8 text-sm"
                : "h-10 w-10",
          ].join(" ")}
          aria-label="Попередній місяць"
        >
          ‹
        </button>
        <p
          className={[
            "min-w-0 truncate text-center tracking-wide",
            hf,
            resort
              ? "font-semibold text-slate-900"
              : "text-[#e8e4dc]",
            embedded ? "text-sm" : compact ? "text-[15px]" : "text-xl md:text-2xl",
          ].join(" ")}
        >
          {compact ? `${UK_MONTHS[month].slice(0, 3)}.` : UK_MONTHS[month]}{" "}
          <span className={resort ? "text-[#4a5f6f]" : "text-[#8a877d]"}>
            {year}
          </span>
        </p>
        <button
          type="button"
          onClick={nextMonth}
          className={[
            "flex items-center justify-center rounded-lg border transition",
            resort
              ? "border-slate-200 text-slate-800 hover:bg-slate-50"
              : "border-[#c9a962]/25 text-[#c9a962] hover:bg-[#c9a962]/12",
            embedded
              ? "h-7 w-7 text-xs"
              : compact
                ? "h-8 w-8 text-sm"
                : "h-10 w-10",
          ].join(" ")}
          aria-label="Наступний місяць"
        >
          ›
        </button>
      </div>

      <div
        className={[
          "grid grid-cols-7 text-center uppercase tracking-[0.15em]",
            resort
              ? `font-semibold text-slate-600 ${hf}`
              : "font-medium text-[#6a6860]",
          embedded
            ? "mt-1.5 gap-y-0 text-[8px]"
            : compact
              ? "mt-3 gap-y-1 text-[9px]"
              : "mt-5 gap-y-3 text-[11px]",
        ].join(" ")}
      >
        {UK_DOW.map((d) => (
          <span
            key={d}
            className={embedded ? "pb-0.5" : compact ? "pb-1" : "pb-2"}
          >
            {compact || embedded ? d.slice(0, 2) : d}
          </span>
        ))}
      </div>

      <div
        className={[
          "grid grid-cols-7",
          embedded ? "gap-px" : compact ? "gap-0.5" : "gap-1 gap-y-2 sm:gap-2",
        ].join(" ")}
      >
        {cells.map((cell, idx) =>
          cell ? (
            <button
              key={idx}
              type="button"
              disabled={isDisabled(cell.date)}
              onClick={() => {
                if (isDisabled(cell.date)) return;
                // Завжди нормалізуємо день — навіть повторний клік по обраній даті тригерить оновлення
                onChange(stripTime(cell.date));
              }}
              className={[
                "relative flex aspect-square items-center justify-center rounded-lg font-medium transition",
                embedded
                  ? "max-h-[26px] min-h-[26px] text-[10px] sm:max-h-[28px] sm:min-h-[28px] sm:text-[11px]"
                  : compact
                    ? "max-h-[30px] text-[11px] sm:max-h-[34px]"
                    : "max-h-[44px] rounded-xl text-sm md:max-h-[52px] md:text-[15px]",
                isDisabled(cell.date)
                  ? resort
                    ? "cursor-not-allowed text-slate-300 opacity-45"
                    : "cursor-not-allowed text-[#4a4844] opacity-35"
                  : resort
                    ? `font-semibold text-slate-900 hover:bg-slate-100 ${hf}`
                    : "text-[#d4cfc4] hover:bg-[#c9a962]/14 hover:text-[#f5f5dc]",
                ymd(cell.date) === sel
                  ? embedded && resort
                    ? "bg-teal-600 font-semibold text-white shadow-md ring-2 ring-teal-700 ring-offset-0"
                    : embedded
                      ? "bg-[#c9a962]/20 text-[#f5f5dc] ring-1 ring-[#c9a962]/70 ring-offset-0"
                      : resort
                        ? "bg-teal-600 font-semibold text-white ring-2 ring-teal-800 ring-offset-2 ring-offset-white"
                        : "bg-[#c9a962]/22 text-[#f5f5dc] ring-2 ring-[#c9a962]/65 ring-offset-1 ring-offset-[#10100e]"
                  : "",
                !isDisabled(cell.date) &&
                  ymd(cell.date) === ymd(today) &&
                  ymd(cell.date) !== sel
                  ? resort
                    ? "ring-2 ring-teal-300 ring-offset-0"
                    : "ring-1 ring-[#c9a962]/25"
                  : "",
              ].join(" ")}
            >
              {cell.day}
            </button>
          ) : (
            <span
              key={idx}
              className={
                embedded
                  ? "aspect-square max-h-[26px] sm:max-h-[28px]"
                  : compact
                    ? "aspect-square max-h-[30px] sm:max-h-[34px]"
                    : "aspect-square max-h-[44px] md:max-h-[52px]"
              }
            />
          ),
        )}
      </div>

      <div
        className={[
          "border-t",
          resort
            ? `border-slate-200 text-slate-600 ${hf}`
            : "border-[#c9a962]/12 text-[#7a766c]",
          embedded
            ? "mt-1.5 flex flex-row flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2 text-[9px]"
            : compact
              ? "mt-3 flex flex-col gap-2 pt-3 text-[10px]"
              : "mt-6 flex flex-wrap items-center justify-between gap-3 pt-5 text-[11px] sm:flex-row",
        ].join(" ")}
      >
        <span className={embedded ? "shrink min-w-0" : ""}>
          Сьогодні —{" "}
          <button
            type="button"
            className={[
              "underline-offset-4 hover:underline",
              resort
                ? "font-semibold text-teal-700 disabled:text-slate-400"
                : "text-[#c9a962]/90",
            ].join(" ")}
            onClick={() => !isDisabled(today) && onChange(today)}
            disabled={isDisabled(today)}
          >
            обрати
          </button>
        </span>
        <span
          className={[
            "leading-snug",
            embedded
              ? resort
                ? "truncate text-right text-[9px] font-semibold text-slate-700"
                : "truncate text-right text-[9px] text-[#8a877d]"
              : compact
                ? resort
                  ? "line-clamp-2 text-[10px] font-semibold text-slate-700"
                  : "line-clamp-2 text-[10px] text-[#8a877d]"
                : "tracking-wide",
          ].join(" ")}
        >
          {value
            ? new Intl.DateTimeFormat("uk-UA", {
                weekday: compact ? "short" : "long",
                day: "numeric",
                month: compact ? "short" : "long",
                year: "numeric",
              }).format(value)
            : "—"}
        </span>
      </div>
    </motion.div>
  );
}
