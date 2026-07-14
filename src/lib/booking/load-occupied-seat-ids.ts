import "reflect-metadata";
import { getDataSource } from "@/lib/db";
import { loadBookedSeatIds } from "@/lib/booking/seat-bookings";

/**
 * Місця, зайняті підтвердженими бронюваннями на календарний день візиту (`YYYY-MM-DD`).
 *
 * Джерело правди — таблиця `seat_bookings` з `UNIQUE(visitDate, seatId)`:
 * рядок туди пишеться атомарно при підтвердженні броні (готівка/на місці — одразу,
 * monobank — після оплати), тож подвійне бронювання неможливе, а «зайнятість»
 * на карті завжди узгоджена з фактичними бронями.
 */
export async function loadOccupiedSeatIdsForVisitDay(
  visitDateKey: string,
): Promise<Set<string>> {
  const ds = await getDataSource();
  return loadBookedSeatIds(ds, visitDateKey);
}
