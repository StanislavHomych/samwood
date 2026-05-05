import "reflect-metadata";
import { NextResponse } from "next/server";
import { loadOccupiedSeatIdsForVisitDay } from "@/lib/booking/load-occupied-seat-ids";
import { notifySeatSyncBooked } from "@/lib/booking/notify-seat-sync-booked";
import { parseBookingCommonBody } from "@/lib/booking/parse-booking-common-body";
import { getBookingRequestRepository, getDataSource } from "@/lib/db";
import { sumSeatPrices } from "@/lib/pool/seat-pricing";

export const runtime = "nodejs";

/**
 * Збереження заявки на бронювання (готівка / на місці).
 * Онлайн-оплата — через POST /api/booking/monobank-invoice.
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний JSON" }, { status: 400 });
  }

  const paymentMethod =
    typeof raw === "object" &&
    raw !== null &&
    "paymentMethod" in raw &&
    typeof (raw as { paymentMethod: unknown }).paymentMethod === "string"
      ? (raw as { paymentMethod: string }).paymentMethod.trim()
      : "";

  if (paymentMethod !== "cash" && paymentMethod !== "on_site") {
    return NextResponse.json(
      { error: "Для цього маршруту вкажіть paymentMethod: cash або on_site" },
      { status: 400 },
    );
  }

  const parsed = parseBookingCommonBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const { visitDate, visitDateKey, seatIds, fullName, phone, details } =
    parsed.data;
  const seatsJson = Object.fromEntries(seatIds.map((id) => [id, true]));
  const amountKopiyky = Math.max(0, Math.round(sumSeatPrices(seatIds) * 100));

  try {
    const taken = await loadOccupiedSeatIdsForVisitDay(visitDate);
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

    const ds = await getDataSource();
    const repo = getBookingRequestRepository(ds);
    const row = repo.create({
      visitDate,
      fullName,
      phone,
      paymentMethod,
      paymentStatus: "requested",
      amountKopiyky,
      paidAt: null,
      details: details || null,
      seatsJson,
      monobankInvoiceId: null,
      paymentPayloadJson: null,
    });
    await repo.save(row);
    notifySeatSyncBooked({ visitDateKey, seatIds });
    return NextResponse.json({ id: row.id });
  } catch (e) {
    console.error("[booking-request]", e);
    return NextResponse.json(
      {
        error:
          "Не вдалося зберегти заявку. Спробуйте ще раз за кілька хвилин.",
      },
      { status: 503 },
    );
  }
}
