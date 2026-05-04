import "reflect-metadata";
import { getBookingRequestRepository, getDataSource } from "@/lib/db";

/** Усі місця, уже збережені в заявках на цей календарний день візиту. */
export async function loadOccupiedSeatIdsForVisitDay(
  visitDayStart: Date,
): Promise<Set<string>> {
  const end = new Date(visitDayStart);
  end.setDate(end.getDate() + 1);

  const ds = await getDataSource();
  const rows = await getBookingRequestRepository(ds)
    .createQueryBuilder("b")
    .where("b.visitDate >= :s", { s: visitDayStart })
    .andWhere("b.visitDate < :e", { e: end })
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
