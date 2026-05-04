/** Дозволені id місць з карти басейну (захист від підробки суми на сервері). */
export function isAllowedPoolSeatId(id: string): boolean {
  return (
    /^S2-\d{1,3}$/.test(id) ||
    /^S3-\d{1,3}$/.test(id) ||
    /^L-\d{1,3}$/.test(id) ||
    /^G-\d{1,3}$/.test(id) ||
    /^B-\d{1,3}$/.test(id) ||
    /^R-\d{1,3}$/.test(id)
  );
}

export const MAX_SEATS_PER_BOOKING = 40;
