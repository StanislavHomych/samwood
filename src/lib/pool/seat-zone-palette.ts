/**
 * Палітра зон на карті + зразки в легенді тарифів.
 * Сектор 3 — коричневий; ряд (L) — жовтий: візуально далеко одне від одного.
 */
export const seatZonePalette = {
  pink: {
    swatch: "#ec4899",
    idle: "bg-[#ec4899] shadow-[inset_0_-2px_0_rgba(0,0,0,0.24)] hover:brightness-110",
    selected:
      "bg-[#db2777] ring-2 ring-amber-300 ring-offset-2 ring-offset-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.22)]",
  },
  /** Сектор 3 на карті — коричневий, не в помаранчево-янтарній гамі як ряд */
  orange: {
    swatch: "#92400e",
    idle: "bg-[#92400e] shadow-[inset_0_-2px_0_rgba(0,0,0,0.28)] hover:brightness-110",
    selected:
      "bg-[#78350f] ring-2 ring-amber-300 ring-offset-2 ring-offset-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.25)]",
  },
  /** Боковий ряд — насичений жовтий */
  yellow: {
    swatch: "#facc15",
    idle: "bg-[#facc15] shadow-[inset_0_-2px_0_rgba(0,0,0,0.12)] hover:brightness-105",
    selected:
      "bg-[#eab308] ring-2 ring-amber-400 ring-offset-2 ring-offset-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)]",
  },
  green: {
    swatch: "#22c55e",
    idle: "bg-[#22c55e] shadow-[inset_0_-2px_0_rgba(0,0,0,0.22)] hover:brightness-110",
    selected:
      "bg-[#16a34a] ring-2 ring-amber-300 ring-offset-2 ring-offset-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.22)]",
  },
  blue: {
    swatch: "#3b82f6",
    idle: "bg-[#3b82f6] shadow-[inset_0_-2px_0_rgba(0,0,0,0.22)] hover:brightness-110",
    selected:
      "bg-[#2563eb] ring-2 ring-amber-300 ring-offset-2 ring-offset-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.22)]",
  },
  grey: {
    swatch: "#64748b",
    idle: "bg-[#64748b] shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]",
    selected:
      "bg-[#475569] ring-2 ring-slate-300/80 ring-offset-2 ring-offset-white",
  },
} as const;

export type SeatVariantKey = keyof typeof seatZonePalette;

export const seatPricingLegendRows = [
  {
    title: "Сектор 2",
    price: 580,
    swatch: seatZonePalette.pink.swatch,
  },
  {
    title: "Сектор 3",
    price: 520,
    swatch: seatZonePalette.orange.swatch,
  },
  {
    title: "Ряд",
    price: 420,
    swatch: seatZonePalette.yellow.swatch,
  },
  {
    title: "Зелена зона",
    price: 750,
    swatch: seatZonePalette.green.swatch,
  },
  {
    title: "Синя / джакузі",
    price: 1100,
    swatch: seatZonePalette.blue.swatch,
  },
] as const;

/** Колір плашки в списку обраних місць (узгоджено з картою). */
export function swatchForSeatId(seatId: string): string {
  if (seatId.startsWith("S2-")) return seatZonePalette.pink.swatch;
  if (seatId.startsWith("S3-")) return seatZonePalette.orange.swatch;
  if (seatId.startsWith("L-")) return seatZonePalette.yellow.swatch;
  if (seatId.startsWith("G-")) return seatZonePalette.green.swatch;
  if (seatId.startsWith("B-") || seatId.startsWith("R-"))
    return seatZonePalette.blue.swatch;
  return seatZonePalette.grey.swatch;
}
