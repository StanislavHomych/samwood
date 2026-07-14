/** Кількість лежаків на карті басейну (L-1 … L-60). */
export const POOL_LOUNGER_COUNT = 60;

/**
 * Дозволені id місць з карти басейну (захист від підробки суми/фантомних місць
 * на сервері). Наразі карта — це рівно 60 лежаків `L-1 … L-60`.
 */
export function isAllowedPoolSeatId(id: string): boolean {
  const m = /^L-(\d{1,3})$/.exec(id);
  if (!m) return false;
  const n = Number(m[1]);
  return n >= 1 && n <= POOL_LOUNGER_COUNT;
}

export const MAX_SEATS_PER_BOOKING = 40;
