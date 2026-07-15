import { isAllowedPoolSeatId, MAX_SEATS_PER_BOOKING } from "@/lib/booking/seat-id";
import { parseVisitDateKey } from "@/lib/dates/visit-date-key";
import { z } from "zod";

export type BookingCommonBody = {
  visitDateKey: string;
  visitDate: Date;
  seatIds: string[];
  /** Місця, позначені як дитячі (підмножина seatIds; тариф діє лише у спец-дні). */
  childSeatIds: string[];
  fullName: string;
  phone: string;
  email: string;
  details: string;
};

type Fail = { ok: false; error: string; status: number };

const bookingCommonSchema = z
  .object({
    visitDateKey: z.string().trim().min(1),
    seatIds: z
      .array(z.string())
      .min(1, `Оберіть від 1 до ${MAX_SEATS_PER_BOOKING} місць`)
      .max(MAX_SEATS_PER_BOOKING, `Оберіть від 1 до ${MAX_SEATS_PER_BOOKING} місць`),
    childSeatIds: z.array(z.string()).max(MAX_SEATS_PER_BOOKING).optional().default([]),
    fullName: z.string().trim().min(2, "Вкажіть повне ім'я").max(200, "Вкажіть повне ім'я"),
    phone: z.string().trim().min(5, "Вкажіть телефон").max(32, "Вкажіть телефон"),
    email: z.string().trim().email("Вкажіть коректний email").max(200, "Задовгий email"),
    details: z.string().trim().max(2000).optional().default(""),
  })
  .strip();

/** Спільна валідація тіла для Monobank та збереження заявки в БД. */
export function parseBookingCommonBody(raw: unknown):
  | { ok: true; data: BookingCommonBody }
  | Fail {
  const parsed = bookingCommonSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Некоректний JSON", status: 400 };
  }
  const { visitDateKey, seatIds, childSeatIds, fullName, phone, email, details } =
    parsed.data;

  const visitDate = parseVisitDateKey(visitDateKey);
  if (!visitDate) {
    return { ok: false, error: "Невірна дата візиту", status: 400 };
  }
  const seen = new Set<string>();
  for (const id of seatIds) {
    if (!isAllowedPoolSeatId(id) || seen.has(id)) {
      return { ok: false, error: "Некоректний список місць", status: 400 };
    }
    seen.add(id);
  }

  // Дитячі місця — лише з-поміж обраних (зайве мовчки відкидаємо).
  const childSet = new Set(
    childSeatIds.filter((id) => seen.has(id)),
  );

  return {
    ok: true,
    data: {
      visitDateKey,
      visitDate,
      seatIds: [...seen],
      childSeatIds: [...childSet],
      fullName,
      phone,
      email,
      details,
    },
  };
}
