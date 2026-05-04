import { NextResponse } from "next/server";
import { parseBookingCommonBody } from "@/lib/booking/parse-booking-common-body";
import { createMonobankInvoice, isMonobankConfigured } from "@/lib/payments/monobank";
import { publicSiteBaseUrl } from "@/lib/site-url";
import { sumSeatPrices } from "@/lib/pool/seat-pricing";

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

  const { visitDateKey, seatIds, fullName, phone, details } = parsed.data;

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
  const amountKopiyky = Math.round(totalUah * 100);
  if (amountKopiyky < 100) {
    return NextResponse.json({ error: "Сума замовлення занадто мала" }, { status: 400 });
  }

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

    // TODO: зберегти booking_requests (fullName, phone, …) + invoiceId у БД

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
