import { parseVisitDateKey } from "@/lib/dates/visit-date-key";

/**
 * Тарифи на лежак (грн). Ціна залежить від дня тижня візиту:
 * Пн–Чт — будній тариф, Пт–Нд — тариф вихідного.
 */
export const LOUNGER_PRICE_WEEKDAY_UAH = 700; // Пн–Чт
export const LOUNGER_PRICE_WEEKEND_UAH = 800; // Пт–Нд

/**
 * Дні зі спец-тарифом «вхід»: кожен лежак — дорослий або дитячий.
 * Після цих дат мапа просто перестає збігатися — повертається звичайний тариф.
 */
export const SPECIAL_ENTRY_DAYS: Record<
  string,
  { adultUah: number; childUah: number }
> = {
  "2026-07-15": { adultUah: 500, childUah: 300 },
  "2026-07-16": { adultUah: 500, childUah: 300 },
  "2026-07-17": { adultUah: 500, childUah: 300 },
  "2026-07-18": { adultUah: 500, childUah: 300 },
};

/** Спец-тариф дня або null, якщо день звичайний. */
export function specialEntryPricesForVisit(
  visitDateKey: string,
): { adultUah: number; childUah: number } | null {
  return SPECIAL_ENTRY_DAYS[visitDateKey] ?? null;
}

/** Пт/Сб/Нд за календарним днем візиту (UTC — як зберігаються дати візиту). */
export function isWeekendVisitKey(visitDateKey: string): boolean {
  const d = parseVisitDateKey(visitDateKey);
  if (!d) return false;
  const dow = d.getUTCDay(); // 0=Нд, 5=Пт, 6=Сб
  return dow === 0 || dow === 5 || dow === 6;
}

/** Ціна лежака на конкретний день візиту (`YYYY-MM-DD`). У спец-дні — дорослий тариф. */
export function loungerPriceForVisit(visitDateKey: string): number {
  const special = specialEntryPricesForVisit(visitDateKey);
  if (special) return special.adultUah;
  return isWeekendVisitKey(visitDateKey)
    ? LOUNGER_PRICE_WEEKEND_UAH
    : LOUNGER_PRICE_WEEKDAY_UAH;
}

/** Ціна конкретного місця на день візиту (наразі всі місця — лежаки). */
export function priceForSeatOnDate(
  _seatId: string,
  visitDateKey: string,
): number {
  return loungerPriceForVisit(visitDateKey);
}

/** Сума за обрані місця на день візиту. */
export function sumSeatPricesForDate(
  seatIds: string[],
  visitDateKey: string,
): number {
  return seatIds.length * loungerPriceForVisit(visitDateKey);
}

/**
 * Сума з урахуванням дитячих місць. Дитячий тариф діє ЛИШЕ у спец-дні
 * (`SPECIAL_ENTRY_DAYS`); у звичайні дні `childSeatIds` ігнорується.
 */
export function sumBookingPriceUah(
  seatIds: string[],
  childSeatIds: string[],
  visitDateKey: string,
): number {
  const special = specialEntryPricesForVisit(visitDateKey);
  if (!special) return sumSeatPricesForDate(seatIds, visitDateKey);
  const childSet = new Set(childSeatIds);
  let sum = 0;
  for (const id of seatIds) {
    sum += childSet.has(id) ? special.childUah : special.adultUah;
  }
  return sum;
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
