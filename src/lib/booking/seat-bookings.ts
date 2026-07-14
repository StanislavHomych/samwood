import "reflect-metadata";
import type { DataSource } from "typeorm";

/**
 * Джерело правди про зайнятість місць — таблиця `seat_bookings`
 * з `UNIQUE(visitDate, seatId)`. Рядок туди пишеться атомарно в момент,
 * коли бронь стає підтвердженою (готівка/на місці — одразу при заявці,
 * monobank — після успішної оплати). Унікальний індекс робить подвійне
 * бронювання одного місця на день фізично неможливим (гонки не проходять).
 */

/** Помилка: частина місць уже зайнята іншою підтвердженою бронню. */
export class SeatConflictError extends Error {
  constructor(public readonly seatIds: string[]) {
    super("SEAT_CONFLICT");
    this.name = "SeatConflictError";
  }
}

/** Ознака unique-violation Postgres (23505). */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

/** Зайняті (підтверджені) місця на день візиту `YYYY-MM-DD`. */
export async function loadBookedSeatIds(
  ds: DataSource,
  visitDateKey: string,
): Promise<Set<string>> {
  const rows: Array<{ seatId: string }> = await ds.query(
    `SELECT "seatId" FROM "seat_bookings" WHERE "visitDate" = $1`,
    [visitDateKey],
  );
  return new Set(rows.map((r) => r.seatId));
}

type CashBookingInput = {
  visitDate: Date;
  visitDateKey: string;
  fullName: string;
  phone: string;
  email: string | null;
  paymentMethod: "cash" | "on_site";
  amountKopiyky: number;
  details: string | null;
  seatIds: string[];
};

/**
 * Атомарно створює заявку (готівка/на місці) + займає місця в `seat_bookings`
 * в одній транзакції. Якщо хоч одне місце вже зайняте — кидає SeatConflictError,
 * і НІЧОГО не записується (rollback).
 */
export async function createConfirmedBookingWithSeats(
  ds: DataSource,
  input: CashBookingInput,
): Promise<{ id: string }> {
  const seatsJson = JSON.stringify(
    Object.fromEntries(input.seatIds.map((id) => [id, true])),
  );
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    // Чистий SQL (без getRepository за класом) — стабільно в dev/HMR і проді.
    const inserted: Array<{ id: string }> = await qr.query(
      `INSERT INTO "booking_requests"
         ("visitDate", "fullName", "phone", "email", "paymentMethod", "paymentStatus",
          "amountKopiyky", "paidAt", "details", "seatsJson",
          "monobankInvoiceId", "paymentPayloadJson")
       VALUES ($1, $2, $3, $4, $5, 'requested', $6, NULL, $7, $8::jsonb, NULL, NULL)
       RETURNING "id"`,
      [
        input.visitDate,
        input.fullName,
        input.phone,
        input.email,
        input.paymentMethod,
        input.amountKopiyky,
        input.details,
        seatsJson,
      ],
    );
    const id = inserted[0].id;

    for (const seatId of input.seatIds) {
      await qr.query(
        `INSERT INTO "seat_bookings" ("bookingRequestId", "visitDate", "seatId")
         VALUES ($1, $2, $3)`,
        [id, input.visitDateKey, seatId],
      );
    }

    await qr.commitTransaction();
    return { id };
  } catch (e) {
    await qr.rollbackTransaction();
    if (isUniqueViolation(e)) throw new SeatConflictError(input.seatIds);
    throw e;
  } finally {
    await qr.release();
  }
}

/**
 * Займає місця за вже існуючою (оплаченою) бронню monobank — best-effort:
 * місця, які встиг зайняти хтось раніше, пропускаються (ON CONFLICT DO NOTHING).
 * Клієнт уже заплатив, тож саму бронь не відхиляємо; повертаємо, які місця
 * реально закріплені, а які — конфліктні (для адмінки / ручного розбору).
 */
export async function claimSeatsForPaidBooking(
  ds: DataSource,
  bookingRequestId: string,
  visitDateKey: string,
  seatIds: string[],
): Promise<{ claimed: string[]; conflicted: string[] }> {
  const claimed: string[] = [];
  for (const seatId of seatIds) {
    const res: Array<{ seatId: string }> = await ds.query(
      `INSERT INTO "seat_bookings" ("bookingRequestId", "visitDate", "seatId")
       VALUES ($1, $2, $3)
       ON CONFLICT ("visitDate", "seatId") DO NOTHING
       RETURNING "seatId"`,
      [bookingRequestId, visitDateKey, seatId],
    );
    if (res.length > 0) claimed.push(seatId);
  }

  // Місця, які не вставились, могли вже належати ЦІЙ САМІЙ броні
  // (напр. webhook закріпив їх раніше, а потім прийшов client-confirm).
  // Такі — не конфлікт, а вже закріплені за нами.
  const notInserted = seatIds.filter((s) => !claimed.includes(s));
  let ownedAlready: string[] = [];
  if (notInserted.length > 0) {
    const owned: Array<{ seatId: string }> = await ds.query(
      `SELECT "seatId" FROM "seat_bookings"
         WHERE "visitDate" = $1 AND "seatId" = ANY($2) AND "bookingRequestId" = $3`,
      [visitDateKey, notInserted, bookingRequestId],
    );
    ownedAlready = owned.map((r) => r.seatId);
  }

  const conflicted = notInserted.filter((s) => !ownedAlready.includes(s));
  return { claimed: [...claimed, ...ownedAlready], conflicted };
}
