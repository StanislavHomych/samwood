/**
 * Демо-тарифи за типом місця (грн / місце). Пізніше можна винести в БД або CMS.
 */
export function priceForSeatId(seatId: string): number {
  if (seatId.startsWith("L-")) return 420;
  if (seatId.startsWith("S2-")) return 580;
  if (seatId.startsWith("S3-")) return 520;
  if (seatId.startsWith("G-")) return 750;
  if (seatId.startsWith("B-") || seatId.startsWith("R-")) return 1100;
  return 500;
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
  if (ml) return `Ряд біля басейну, місце ${ml[1]}`;
  const mg = /^G-(\d+)$/.exec(seatId);
  if (mg) return `Тераса, місце ${mg[1]}`;
  const mb = /^B-(\d+)$/.exec(seatId);
  if (mb) return `Ліжак, місце ${mb[1]}`;
  const mr = /^R-(\d+)$/.exec(seatId);
  if (mr) return `Джакузі, місце ${mr[1]}`;
  return seatId;
}
