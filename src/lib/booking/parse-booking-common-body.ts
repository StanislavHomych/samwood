import { isAllowedPoolSeatId, MAX_SEATS_PER_BOOKING } from "@/lib/booking/seat-id";
import { parseVisitDateKey } from "@/lib/dates/visit-date-key";

export type BookingCommonBody = {
  visitDateKey: string;
  visitDate: Date;
  seatIds: string[];
  fullName: string;
  phone: string;
  details: string;
};

type Fail = { ok: false; error: string; status: number };

/** Спільна валідація тіла для Monobank та збереження заявки в БД. */
export function parseBookingCommonBody(raw: unknown):
  | { ok: true; data: BookingCommonBody }
  | Fail {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Некоректний JSON", status: 400 };
  }
  const body = raw as Record<string, unknown>;

  const visitDateKey =
    typeof body.visitDateKey === "string" ? body.visitDateKey.trim() : "";
  const seatIds = Array.isArray(body.seatIds) ? body.seatIds : [];
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const details =
    typeof body.details === "string" ? body.details.trim().slice(0, 2000) : "";

  const visitDate = parseVisitDateKey(visitDateKey);
  if (!visitDate) {
    return { ok: false, error: "Невірна дата візиту", status: 400 };
  }
  if (seatIds.length === 0 || seatIds.length > MAX_SEATS_PER_BOOKING) {
    return {
      ok: false,
      error: `Оберіть від 1 до ${MAX_SEATS_PER_BOOKING} місць`,
      status: 400,
    };
  }
  const seen = new Set<string>();
  for (const id of seatIds) {
    if (typeof id !== "string" || !isAllowedPoolSeatId(id) || seen.has(id)) {
      return { ok: false, error: "Некоректний список місць", status: 400 };
    }
    seen.add(id);
  }
  if (fullName.length < 2 || fullName.length > 200) {
    return { ok: false, error: "Вкажіть повне ім'я", status: 400 };
  }
  if (phone.length < 5 || phone.length > 32) {
    return { ok: false, error: "Вкажіть телефон", status: 400 };
  }

  return {
    ok: true,
    data: {
      visitDateKey,
      visitDate,
      seatIds: [...seen],
      fullName,
      phone,
      details,
    },
  };
}
