/**
 * Тарифи за зонами (грн / місце). Пізніше можна винести в БД або CMS.
 * УВАГА: саме з цих значень рахується сума інвойсу Monobank —
 * перевірте/оновіть ціни перед запуском реальних оплат.
 */
export const ZONE_PRICES_UAH = {
  /** S2 — сектор 2 */
  S2: 1,
  /** S3 — сектор 3 */
  S3: 1,
  /** L — лежак (боковий ряд) */
  L: 1,
  /** G — тераса */
  G: 1,
  /** B — ліжак */
  B: 1,
  /** R — джакузі */
  R: 1,
} as const;

export function priceForSeatId(seatId: string): number {
  const zone = seatId.split("-")[0] as keyof typeof ZONE_PRICES_UAH;
  return ZONE_PRICES_UAH[zone] ?? ZONE_PRICES_UAH.L;
}

export function sumSeatPrices(seatIds: string[]): number {
  return seatIds.reduce((s, id) => s + priceForSeatId(id), 0);
}

/** Підпис рядка в кошику / боковій панелі (укр.). */
export function formatSeatLineUk(seatId: string): string {
  const m2 = /^S2-(\d+)$/.exec(seatId);
  if (m2) return `Сектор 2, місце ${m2[1]}`;
  const m3 = /^S3-(\d+)$/.exec(seatId);
  if (m3) return `Сектор 3, місце ${m3[1]}`;
  const ml = /^L-(\d+)$/.exec(seatId);
  if (ml) return `Лежак №${ml[1]}`;
  const mg = /^G-(\d+)$/.exec(seatId);
  if (mg) return `Тераса, місце ${mg[1]}`;
  const mb = /^B-(\d+)$/.exec(seatId);
  if (mb) return `Ліжак, місце ${mb[1]}`;
  const mr = /^R-(\d+)$/.exec(seatId);
  if (mr) return `Джакузі, місце ${mr[1]}`;
  return seatId;
}
