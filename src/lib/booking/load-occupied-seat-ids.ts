import "reflect-metadata";
import { getBookingRequestRepository, getDataSource } from "@/lib/db";
import { nextVisitDay } from "@/lib/dates/visit-date-key";

/**
 * Усі місця, уже зайняті підтвердженими заявками на цей календарний день візиту.
 *
 * Готівка / оплата на місці — це підтверджені брони (займають місце одразу).
 * Онлайн (Monobank) враховуємо лише як оплачені: неоплачений рахунок (створений
 * інвойс, але клієнт не завершив оплату) НЕ має тримати місце вічно — інакше
 * покинута оплата назавжди блокує місце для всіх.
 */
export async function loadOccupiedSeatIdsForVisitDay(
  visitDayStart: Date,
): Promise<Set<string>> {
  const end = nextVisitDay(visitDayStart);

  const ds = await getDataSource();
  const rows = await getBookingRequestRepository(ds)
    .createQueryBuilder("b")
    .where("b.visitDate >= :s", { s: visitDayStart })
    .andWhere("b.visitDate < :e", { e: end })
    .andWhere(
      "(b.paymentMethod <> :mono OR b.paymentStatus = :paid)",
      { mono: "monobank", paid: "paid" },
    )
    .getMany();

  const out = new Set<string>();
  for (const r of rows) {
    if (!r.seatsJson || typeof r.seatsJson !== "object") continue;
    for (const [k, v] of Object.entries(r.seatsJson)) {
      if (v) out.add(k);
    }
  }
  return out;
}
