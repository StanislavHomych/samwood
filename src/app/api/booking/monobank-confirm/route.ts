import "reflect-metadata";
import { NextResponse } from "next/server";
import { formatVisitDateKey, parseVisitDateKey } from "@/lib/dates/visit-date-key";
import { getBookingRequestRepository, getDataSource } from "@/lib/db";
import { claimSeatsForPaidBooking } from "@/lib/booking/seat-bookings";
import { deliverBookingConfirmationOnce } from "@/lib/booking/send-confirmation-email";
import { releaseHoldsForSeats } from "@/lib/booking/seat-holds";
import { isAllowedPoolSeatId, MAX_SEATS_PER_BOOKING } from "@/lib/booking/seat-id";
import { getMonobankInvoiceStatus, isMonobankConfigured } from "@/lib/payments/monobank";
import { z } from "zod";

export const runtime = "nodejs";

const confirmBodySchema = z
  .object({
    createdAtIso: z.string().trim().optional(),
    visitDateKey: z.string().trim().min(1),
    seatIds: z
      .array(z.string())
      .min(1, `Оберіть від 1 до ${MAX_SEATS_PER_BOOKING} місць`)
      .max(MAX_SEATS_PER_BOOKING, `Оберіть від 1 до ${MAX_SEATS_PER_BOOKING} місць`),
    fullName: z.string().trim().max(200).optional().default(""),
    phone: z.string().trim().min(5, "Не вказано телефон").max(32, "Не вказано телефон"),
    email: z.string().trim().email().max(200).optional().default(""),
    details: z.string().trim().max(2000).optional().default(""),
    paymentMethod: z.literal("monobank").optional().default("monobank"),
    // Клієнтська сума — лише для аудиту; фактична сума береться з Monobank.
    amountKopiyky: z.number().finite().optional(),
    invoiceId: z.string().trim().min(1, "Немає invoiceId").max(128),
  })
  .strict();

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний JSON" }, { status: 400 });
  }

  const parsed = confirmBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некоректне тіло запиту" }, { status: 400 });
  }

  const body = parsed.data;
  const visitDate = parseVisitDateKey(body.visitDateKey);
  if (!visitDate) {
    return NextResponse.json({ error: "Некоректна дата візиту" }, { status: 400 });
  }

  const seen = new Set<string>();
  for (const id of body.seatIds) {
    if (!isAllowedPoolSeatId(id) || seen.has(id)) {
      return NextResponse.json({ error: "Некоректний список місць" }, { status: 400 });
    }
    seen.add(id);
  }
  const seatIds = [...seen];

  if (!isMonobankConfigured()) {
    return NextResponse.json({ error: "Онлайн-оплата не налаштована" }, { status: 503 });
  }

  // Єдине джерело правди про оплату — Monobank, а не тіло запиту.
  let invoice;
  try {
    invoice = await getMonobankInvoiceStatus(body.invoiceId);
  } catch (e) {
    console.error("[monobank-confirm] invoice/status failed", e);
    return NextResponse.json(
      { error: "Не вдалося перевірити оплату в Monobank. Спробуйте ще раз." },
      { status: 502 },
    );
  }

  if (invoice.status !== "success") {
    return NextResponse.json(
      {
        error: "Оплата ще не підтверджена Monobank",
        status: invoice.status,
      },
      { status: 409 },
    );
  }

  const paidAt = invoice.modifiedDate ? new Date(invoice.modifiedDate) : new Date();
  const verifiedAmountKopiyky =
    typeof invoice.amount === "number" ? invoice.amount : null;

  try {
    const ds = await getDataSource();
    const repo = getBookingRequestRepository(ds);

    const existing = await repo.findOne({
      where: { monobankInvoiceId: invoice.invoiceId },
    });

    if (existing) {
      // Заявку створено при виставленні рахунку: місця/дату/суму не даємо
      // переписати клієнтом — лише фіксуємо факт оплати.
      if (existing.paymentStatus !== "paid") {
        existing.paymentStatus = "paid";
        existing.paidAt = paidAt;
      }
      if (verifiedAmountKopiyky != null) existing.amountKopiyky = verifiedAmountKopiyky;
      if (!existing.fullName || existing.fullName === "Без імені") {
        existing.fullName = body.fullName || existing.fullName || "Без імені";
      }
      if (!existing.phone) existing.phone = body.phone;
      if (!existing.email && body.email) existing.email = body.email;
      if (!existing.details && body.details) existing.details = body.details;

      // Закріплюємо місця за оплаченою бронню (атомарно через UNIQUE-індекс).
      const rowKey = formatVisitDateKey(existing.visitDate);
      const rowSeatIds = Object.keys(existing.seatsJson ?? {});
      const seatsToClaim = rowSeatIds.length ? rowSeatIds : seatIds;
      const { conflicted } = await claimSeatsForPaidBooking(
        ds,
        existing.id,
        rowKey,
        seatsToClaim,
      );

      existing.paymentPayloadJson = {
        ...(existing.paymentPayloadJson ?? {}),
        source: "pay_return_client_verified",
        monobankStatus: invoice.raw,
        ...(conflicted.length ? { seatConflicts: conflicted } : {}),
      };
      await repo.save(existing);

      await releaseHoldsForSeats(rowKey, seatsToClaim).catch(() => {});

      await deliverBookingConfirmationOnce(ds, {
        id: existing.id,
        email: existing.email,
        fullName: existing.fullName,
        phone: existing.phone,
        visitDateKey: rowKey,
        seatIds: seatsToClaim,
        amountKopiyky: existing.amountKopiyky,
        paymentMethod: existing.paymentMethod,
        details: existing.details,
      });

      return NextResponse.json({
        ok: true,
        id: existing.id,
        updated: true,
        seatConflicts: conflicted,
      });
    }

    // Рахунок оплачено, але заявка не збереглась при створенні інвойсу
    // (наприклад, БД була недоступна) — створюємо з перевіреною сумою.
    const row = repo.create({
      visitDate,
      fullName: body.fullName || "Без імені",
      phone: body.phone,
      email: body.email || null,
      paymentMethod: "monobank",
      paymentStatus: "paid",
      monobankInvoiceId: invoice.invoiceId,
      amountKopiyky: verifiedAmountKopiyky,
      paidAt,
      details: body.details || null,
      seatsJson: Object.fromEntries(seatIds.map((id) => [id, true])),
      paymentPayloadJson: {
        source: "pay_return_client_verified",
        visitDateKey: body.visitDateKey,
        seatIds,
        clientAmountKopiyky: body.amountKopiyky ?? null,
        monobankStatus: invoice.raw,
      },
    });
    await repo.save(row);

    const { conflicted } = await claimSeatsForPaidBooking(
      ds,
      row.id,
      body.visitDateKey,
      seatIds,
    );
    if (conflicted.length) {
      row.paymentPayloadJson = {
        ...(row.paymentPayloadJson ?? {}),
        seatConflicts: conflicted,
      };
      await repo.save(row);
    }

    await releaseHoldsForSeats(body.visitDateKey, seatIds).catch(() => {});

    await deliverBookingConfirmationOnce(ds, {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      phone: row.phone,
      visitDateKey: body.visitDateKey,
      seatIds,
      amountKopiyky: row.amountKopiyky,
      paymentMethod: row.paymentMethod,
      details: row.details,
    });

    return NextResponse.json({ ok: true, id: row.id, seatConflicts: conflicted });
  } catch (e) {
    const message = e instanceof Error ? e.message : "db_error";
    return NextResponse.json(
      { error: `Не вдалося передати оплату в адмінку: ${message}` },
      { status: 503 },
    );
  }
}
