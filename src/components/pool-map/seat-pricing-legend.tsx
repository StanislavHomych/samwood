"use client";

import { seatPricingLegendRows } from "@/lib/pool/seat-zone-palette";

type SeatPricingLegendProps = {
  resortChrome?: boolean;
  /** На карті — компактно, без власної рамки (батько дає контейнер). */
  variant?: "standalone" | "mapOverlay";
  /** Додати зразки: заброньовано / чернетка іншого відвідувача. */
  occupancyLegend?: boolean;
};

/** Легенда тарифів: зразок кольору + зона + ціна. */
export function SeatPricingLegend({
  resortChrome,
  variant = "standalone",
  occupancyLegend = false,
}: SeatPricingLegendProps) {
  const isOverlay = variant === "mapOverlay";

  if (isOverlay) {
    const panel = resortChrome
      ? "border border-slate-200/90 bg-slate-50"
      : "border border-white/10 bg-zinc-950/50";

    /** Плоский «сквіркл»: заливка + тонка рамка; збільшений для читабельності на карті. */
    const sq = "h-5 w-5 shrink-0 rounded-[6px] border";
    const swatchZoneBorder = resortChrome ? "border-black/15" : "border-white/15";

    const priceOnly = resortChrome
      ? "text-[10px] font-semibold tabular-nums leading-none text-slate-800"
      : "text-[10px] font-semibold tabular-nums leading-none text-zinc-100";

    const statusLabel = resortChrome
      ? "text-[10px] font-medium leading-tight text-slate-700"
      : "text-[10px] font-medium leading-tight text-zinc-300";

    const divider = resortChrome
      ? "h-px w-full shrink-0 bg-slate-200"
      : "h-px w-full shrink-0 bg-white/12";

    return (
      <div
        className={[
          "flex min-h-0 min-w-0 flex-1 flex-col gap-1 rounded-md px-1.5 py-1 sm:gap-1.5 sm:px-2 sm:py-1.5",
          panel,
        ].join(" ")}
      >
        <span className="sr-only">Тарифи за зонами: назва зони у підказці при наведенні на зразок.</span>
        <div
          className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-2.5"
          role="list"
          aria-label="Тарифи за зонами"
        >
          {seatPricingLegendRows.map((row) => (
            <span
              key={row.title}
              role="listitem"
              title={`${row.title} — ${row.price} ₴`}
              aria-label={`${row.title}, ${row.price} гривень`}
              className="inline-flex max-w-full shrink-0 items-center gap-1.5"
            >
              <span
                className={`${sq} ${swatchZoneBorder}`}
                style={{ backgroundColor: row.swatch }}
                aria-hidden
              />
              <span className={`whitespace-nowrap ${priceOnly}`}>{row.price} ₴</span>
            </span>
          ))}
        </div>
        {occupancyLegend ? (
          <>
            <div className={divider} aria-hidden />
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4"
              role="list"
              aria-label="Стан місць"
            >
              <span
                role="listitem"
                className="inline-flex shrink-0 items-center gap-1.5 sm:gap-2"
              >
                <span className={`${sq} border-slate-900/35 bg-slate-800`} aria-hidden />
                <span className={`whitespace-nowrap ${statusLabel}`}>Заброньовано</span>
              </span>
              <span
                role="listitem"
                className="inline-flex shrink-0 items-center gap-1.5 sm:gap-2"
              >
                <span className={`${sq} border-slate-400/65 bg-slate-200`} aria-hidden />
                <span className={`whitespace-nowrap ${statusLabel}`}>Хтось обирає</span>
              </span>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={[
        "flex w-full max-w-[920px] flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2.5 text-[10px] font-semibold leading-snug shadow-sm",
        resortChrome
          ? "border-[#1f3744]/20 bg-gradient-to-b from-[#dceaf0]/95 to-[#c8dae4]/90 text-[#1e3038] ring-1 ring-white/50"
          : "border-[#c9a962]/22 bg-[#141210]/88 text-[#c9c4b8] ring-1 ring-white/[0.04]",
      ].join(" ")}
    >
      {seatPricingLegendRows.map((row, i) => (
        <span key={row.title} className="inline-flex items-center gap-1">
          {i > 0 ? (
            <span
              className={
                resortChrome ? "text-[#5a6a72]" : "text-[#6b6560]"
              }
              aria-hidden
            >
              ·
            </span>
          ) : null}
          <span
            className={[
              "shrink-0 rounded-sm border border-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]",
              "h-2.5 w-2.5",
            ].join(" ")}
            style={{ backgroundColor: row.swatch }}
            aria-hidden
          />
          <span className="text-left">
            {row.title} —{" "}
            <strong className={resortChrome ? "text-teal-950" : "text-[#e8dcc8]"}>
              {row.price} ₴
            </strong>
          </span>
        </span>
      ))}
      {occupancyLegend ? (
        <>
          <span
            className={resortChrome ? "text-[#5a6a72]" : "text-[#6b6560]"}
            aria-hidden
          >
            ·
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm border border-slate-950/50 bg-slate-900 shadow-inner"
              aria-hidden
            />
            <span className="text-left">Заброньовано</span>
          </span>
          <span
            className={resortChrome ? "text-[#5a6a72]" : "text-[#6b6560]"}
            aria-hidden
          >
            ·
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm border border-slate-300 bg-slate-200 shadow-sm"
              aria-hidden
            />
            <span className="text-left">Хтось обирає</span>
          </span>
        </>
      ) : null}
    </div>
  );
}
