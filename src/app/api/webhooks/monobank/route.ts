import "reflect-metadata";
import { NextResponse } from "next/server";
import { getBookingRequestRepository, getDataSource } from "@/lib/db";
import { claimSeatsForPaidBooking } from "@/lib/booking/seat-bookings";
import { deliverBookingConfirmationOnce } from "@/lib/booking/send-confirmation-email";
import { sumBookingPriceUah } from "@/lib/pool/seat-pricing";
import { formatVisitDateKey } from "@/lib/dates/visit-date-key";
import {
  fiscalChecksForAudit,
  getMonobankFiscalChecks,
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
  let valid: boolean;
  try {
    valid = await verifyMonobankWebhookSignature(rawBody, xSign);
  } catch (verifyErr) {
    // Не змогли перевірити підпис (напр. впав GET pubkey) — це НЕ «поганий підпис».
    // Повертаємо 5xx, щоб Monobank повторив доставку пізніше, а не втратив подію.
    console.error("[monobank-webhook] signature verification unavailable", verifyErr);
    return NextResponse.json({ error: "verification unavailable" }, { status: 503 });
  }
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
    // Дитячі місця (спец-дні) — збережені при створенні інвойсу.
    const rawChild = row.paymentPayloadJson?.childSeatIds;
    const childSeatIds = Array.isArray(rawChild)
      ? rawChild.filter((x): x is string => typeof x === "string")
      : [];
    // Очікувана сума — та, що сервер зафіксував при створенні інвойсу
    // (залежить від дитячих місць); fallback — перерахунок.
    const expectedKopiyky =
      row.amountKopiyky ??
      Math.max(
        100,
        Math.round(sumBookingPriceUah(rowSeatIds, childSeatIds, rowKey) * 100),
      );
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

    // Фіскальний чек (Checkbox/ПРРО) — вторинне, помилку ковтаємо.
    // Зберігаємо лише метадані (без важкого base64 PDF).
    let fiscalChecksAudit: Record<string, unknown> | undefined;
    if (status === "success") {
      try {
        const { checks } = await getMonobankFiscalChecks(invoiceId);
        fiscalChecksAudit = fiscalChecksForAudit(checks);
      } catch (e) {
        console.error("[monobank-webhook] fiscal-checks failed", e);
      }
    }
    // Звірка оплаченої суми з очікуваною (defense-in-depth) — лише аудит-флаг.
    let amountMismatch:
      | { expectedKopiyky: number; paidKopiyky: number }
      | undefined;
    if (
      status === "success" &&
      typeof payload.amount === "number" &&
      payload.amount !== expectedKopiyky
    ) {
      amountMismatch = { expectedKopiyky, paidKopiyky: payload.amount };
      console.error(
        "[monobank-webhook] сума оплати не збігається з очікуваною",
        { ...amountMismatch, id: row.id, rowKey, rowSeatIds },
      );
    }

    row.paymentPayloadJson = {
      ...(row.paymentPayloadJson ?? {}),
      source: "monobank_webhook",
      webhook: payload,
      ...(fiscalChecksAudit ? { fiscalChecks: fiscalChecksAudit } : {}),
      ...(conflicted.length ? { seatConflicts: conflicted } : {}),
      ...(amountMismatch ? { amountMismatch } : {}),
    };
    await repo.save(row);

    // Лист-підтвердження — лише коли всі місця реально закріплені за бронню.
    // Якщо є конфлікт (клієнт заплатив, місце зайняте) — хибний «підтверджено»
    // не шлемо; бронь лишається з seatConflicts для ручного розбору/рефанду.
    if (status === "success" && conflicted.length === 0) {
      await deliverBookingConfirmationOnce(ds, {
        id: row.id,
        email: row.email,
        fullName: row.fullName,
        phone: row.phone,
        visitDateKey: rowKey,
        seatIds: rowSeatIds,
        childSeatIds,
        amountKopiyky: row.amountKopiyky,
        paymentMethod: row.paymentMethod,
        details: row.details,
      });
    } else if (status === "success" && conflicted.length > 0) {
      console.error(
        "[monobank-webhook] оплачено, але місця конфліктують — лист не надіслано",
        row.id,
        conflicted,
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[monobank-webhook] db error", e);
    // 5xx → monobank повторить доставку пізніше.
    return NextResponse.json({ error: "db error" }, { status: 503 });
  }
}
