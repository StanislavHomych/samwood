import "reflect-metadata";
import { NextResponse } from "next/server";
import { getBookingRequestRepository, getDataSource } from "@/lib/db";
import { claimSeatsForPaidBooking } from "@/lib/booking/seat-bookings";
import { deliverBookingConfirmationOnce } from "@/lib/booking/send-confirmation-email";
import { formatVisitDateKey } from "@/lib/dates/visit-date-key";
import {
  isMonobankConfigured,
  verifyMonobankWebhookSignature,
  type MonobankInvoiceStatus,
} from "@/lib/payments/monobank";

export const runtime = "nodejs";

/** Статус Monobank → paymentStatus заявки. */
const STATUS_MAP: Record<MonobankInvoiceStatus, string> = {
  created: "requested",
  processing: "processing",
  hold: "hold",
  success: "paid",
  failure: "failed",
  reversed: "reversed",
  expired: "expired",
};

/**
 * Monobank надсилає POST при зміні статусу рахунку (якщо задано MONOBANK_WEBHOOK_URL).
 * Тіло — як у GET invoice/status; підпис — заголовок `X-Sign`
 * (base64 ECDSA/SHA-256 від сирого тіла, ключ — GET /api/merchant/pubkey).
 */
export async function POST(req: Request) {
  const rawBody = await req.text().catch(() => "");
  if (!rawBody) return NextResponse.json({ error: "empty body" }, { status: 400 });

  if (!isMonobankConfigured()) {
    return NextResponse.json({ error: "monobank not configured" }, { status: 503 });
  }

  const xSign = req.headers.get("x-sign") ?? "";
  const valid = await verifyMonobankWebhookSignature(rawBody, xSign).catch(() => false);
  if (!valid) {
    console.warn("[monobank-webhook] invalid X-Sign signature");
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const invoiceId = typeof payload.invoiceId === "string" ? payload.invoiceId : "";
  const status = typeof payload.status === "string" ? (payload.status as MonobankInvoiceStatus) : null;
  if (!invoiceId || !status || !(status in STATUS_MAP)) {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  try {
    const ds = await getDataSource();
    const repo = getBookingRequestRepository(ds);
    const row = await repo.findOne({ where: { monobankInvoiceId: invoiceId } });
    if (!row) {
      // Заявка могла не зберегтись при створенні інвойсу — не падаємо,
      // клієнтський confirm створить її після перевірки статусу.
      console.warn("[monobank-webhook] no booking for invoice", invoiceId, status);
      return NextResponse.json({ ok: true, unknownInvoice: true });
    }

    // Не відкатуємо "paid" подіями, що прийшли не по порядку (крім повернення коштів).
    const next = STATUS_MAP[status];
    if (row.paymentStatus !== "paid" || next === "paid" || next === "reversed") {
      row.paymentStatus = next;
    }
    let conflicted: string[] = [];
    const rowKey = formatVisitDateKey(row.visitDate);
    const rowSeatIds = Object.keys(row.seatsJson ?? {});
    if (status === "success") {
      row.paidAt =
        typeof payload.modifiedDate === "string" && !Number.isNaN(new Date(payload.modifiedDate).getTime())
          ? new Date(payload.modifiedDate)
          : new Date();
      if (typeof payload.amount === "number") row.amountKopiyky = payload.amount;

      // Закріплюємо місця за оплаченою бронню (атомарно через UNIQUE-індекс).
      if (rowSeatIds.length) {
        ({ conflicted } = await claimSeatsForPaidBooking(ds, row.id, rowKey, rowSeatIds));
      }
    }
    row.paymentPayloadJson = {
      ...(row.paymentPayloadJson ?? {}),
      source: "monobank_webhook",
      webhook: payload,
      ...(conflicted.length ? { seatConflicts: conflicted } : {}),
    };
    await repo.save(row);

    // Лист-підтвердження клієнту після успішної оплати (один раз на бронь).
    if (status === "success") {
      await deliverBookingConfirmationOnce(ds, {
        id: row.id,
        email: row.email,
        fullName: row.fullName,
        phone: row.phone,
        visitDateKey: rowKey,
        seatIds: rowSeatIds,
        amountKopiyky: row.amountKopiyky,
        paymentMethod: row.paymentMethod,
        details: row.details,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[monobank-webhook] db error", e);
    // 5xx → monobank повторить доставку пізніше.
    return NextResponse.json({ error: "db error" }, { status: 503 });
  }
}
