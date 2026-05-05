import { NextResponse } from "next/server";
import { parseBookingCommonBody } from "@/lib/booking/parse-booking-common-body";
import { createMonobankInvoice, isMonobankConfigured } from "@/lib/payments/monobank";
import { publicSiteBaseUrl } from "@/lib/site-url";
import { sumSeatPrices } from "@/lib/pool/seat-pricing";
import { getBookingRequestRepository, getDataSource } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний JSON" }, { status: 400 });
  }

  const parsed = parseBookingCommonBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const { visitDate, visitDateKey, seatIds, fullName, phone, details } = parsed.data;

  if (!isMonobankConfigured()) {
    return NextResponse.json(
      {
        error:
          "Онлайн-оплата тимчасово недоступна. Оберіть готівку, оплату на місці або спробуйте пізніше.",
      },
      { status: 503 },
    );
  }

  const totalUah = sumSeatPrices(seatIds);
  // Monobank не приймає суму меншу за 1 грн.
  const amountKopiyky = Math.max(100, Math.round(totalUah * 100));

  const base = publicSiteBaseUrl();
  const redirectUrl = `${base}/bron/pay-return`;

  const ref = `bron-${visitDateKey}-${Date.now().toString(36)}`;
  let destination = `Rivera басейн, ${visitDateKey} · ${seatIds.length} місць`;
  if (details) destination += ` · ${details.slice(0, 48)}`;
  destination = destination.slice(0, 128);

  const webhook = process.env.MONOBANK_WEBHOOK_URL?.trim();

  try {
    const { invoiceId, pageUrl } = await createMonobankInvoice({
      amountKopiyky,
      reference: ref,
      destination,
      redirectUrl,
      webHookUrl: webhook || undefined,
    });

    try {
      const ds = await getDataSource();
      const repo = getBookingRequestRepository(ds);
      const seatsJson = Object.fromEntries(seatIds.map((id) => [id, true]));
      const existing = await repo.findOne({ where: { monobankInvoiceId: invoiceId } });
      if (!existing) {
        const row = repo.create({
          visitDate,
          fullName,
          phone,
          paymentMethod: "monobank",
          paymentStatus: "requested",
          monobankInvoiceId: invoiceId,
          amountKopiyky,
          paidAt: null,
          details: details || null,
          seatsJson,
          paymentPayloadJson: {
            source: "monobank_invoice_create",
            visitDateKey,
            seatIds,
            amountKopiyky,
            invoiceId,
          },
        });
        await repo.save(row);
      }
    } catch (persistError) {
      console.error("[monobank-invoice] failed to persist pending booking", persistError);
    }

    return NextResponse.json({
      invoiceId,
      pageUrl,
      amountKopiyky,
    });
  } catch (e) {
    console.error("[monobank-invoice]", e);
    return NextResponse.json(
      {
        error:
          "Не вдалося відкрити сторінку оплати. Спробуйте ще раз за кілька хвилин або оберіть інший спосіб оплати.",
      },
      { status: 502 },
    );
  }
}
