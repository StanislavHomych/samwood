import { NextResponse } from "next/server";
import { parseBookingCommonBody } from "@/lib/booking/parse-booking-common-body";
import { loadOccupiedSeatIdsForVisitDay } from "@/lib/booking/load-occupied-seat-ids";
import { claimSeatHoldsForPayment, releaseSeatHolds } from "@/lib/booking/seat-holds";
import { createMonobankInvoice, isMonobankConfigured } from "@/lib/payments/monobank";
import { publicSiteBaseUrl } from "@/lib/site-url";
import { sumSeatPricesForDate } from "@/lib/pool/seat-pricing";
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

  const { visitDate, visitDateKey, seatIds, fullName, phone, email, details } = parsed.data;

  // Id вкладки покупця (щоб дозволити захват ЙОГО ж холдів на час оплати).
  // parseBookingCommonBody його відкидає, тому читаємо з raw окремо.
  const requesterClientId =
    typeof raw === "object" &&
    raw !== null &&
    "clientId" in raw &&
    typeof (raw as { clientId: unknown }).clientId === "string"
      ? (raw as { clientId: string }).clientId.trim().slice(0, 64)
      : "";

  if (!isMonobankConfigured()) {
    return NextResponse.json(
      {
        error:
          "Онлайн-оплата тимчасово недоступна. Оберіть готівку, оплату на місці або спробуйте пізніше.",
      },
      { status: 503 },
    );
  }

  // Рання перевірка зайнятості: не даємо платити за вже заброньоване місце.
  // Best-effort — якщо читання впало, не блокуємо оплату (persist нижче все одно
  // ловить гонку, а закріплення місць — атомарне через UNIQUE-індекс).
  try {
    const taken = await loadOccupiedSeatIdsForVisitDay(visitDateKey);
    const clash = seatIds.filter((id) => taken.has(id));
    if (clash.length > 0) {
      return NextResponse.json(
        {
          error:
            "Частина місць уже зайнята іншою заявкою. Оновіть сторінку й оберіть інші.",
          clashSeatIds: clash,
        },
        { status: 409 },
      );
    }
  } catch (occErr) {
    console.error("[monobank-invoice] occupancy pre-check failed", occErr);
  }

  const ref = `bron-${visitDateKey}-${Date.now().toString(36)}`;

  // Атомарний захват холдів на час оплати: якщо місце зараз тримає ІНШИЙ
  // активний клієнт — 409 ще ДО оплати (єдиного переможця обирає UNIQUE-індекс).
  // Власні холди покупця переписуються на платіжні з довшим TTL, щоб пережити
  // перехід на сторінку Monobank (heartbeat з вкладки там зникає).
  // Працює лише коли фронт передав clientId; без нього — стара поведінка.
  const payHoldId = `pay:${ref}`.slice(0, 64);
  let holdsClaimed = false;
  if (requesterClientId) {
    try {
      const claim = await claimSeatHoldsForPayment(
        visitDateKey,
        requesterClientId,
        payHoldId,
        seatIds,
      );
      if (!claim.ok) {
        return NextResponse.json(
          {
            error:
              "Частина місць щойно обрав інший відвідувач. Оновіть сторінку й оберіть інші.",
            clashSeatIds: claim.conflicted,
          },
          { status: 409 },
        );
      }
      holdsClaimed = true;
    } catch (holdErr) {
      // Best-effort: збій БД не блокує оплату (нижче все одно є атомарне
      // закріплення місць після оплати через UNIQUE-індекс).
      console.error("[monobank-invoice] payment hold claim failed", holdErr);
    }
  }

  const totalUah = sumSeatPricesForDate(seatIds, visitDateKey);
  // Monobank не приймає суму меншу за 1 грн.
  const amountKopiyky = Math.max(100, Math.round(totalUah * 100));

  const base = publicSiteBaseUrl();
  const redirectUrl = `${base}/bron/pay-return`;

  let destination = `Samwood, ${visitDateKey} · ${seatIds.length} місць`;
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
          email: email || null,
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
    // Інвойс не створено — знімаємо платіжні холди, щоб місця не висіли
    // заблокованими і клієнт міг одразу повторити спробу.
    if (holdsClaimed) {
      await releaseSeatHolds(visitDateKey, payHoldId).catch(() => {});
    }
    return NextResponse.json(
      {
        error:
          "Не вдалося відкрити сторінку оплати. Спробуйте ще раз за кілька хвилин або оберіть інший спосіб оплати.",
      },
      { status: 502 },
    );
  }
}
