import "reflect-metadata";
import { NextResponse } from "next/server";
import { parseVisitDateKey } from "@/lib/dates/visit-date-key";
import { getBookingRequestRepository, getDataSource } from "@/lib/db";
import { notifySeatSyncBooked } from "@/lib/booking/notify-seat-sync-booked";
import { isAllowedPoolSeatId, MAX_SEATS_PER_BOOKING } from "@/lib/booking/seat-id";
import { z } from "zod";

export const runtime = "nodejs";

type ConfirmBody = {
  createdAtIso: string;
  visitDateKey: string;
  seatIds: string[];
  fullName: string;
  phone: string;
  details?: string;
  paymentMethod: "monobank";
  amountKopiyky: number;
  invoiceId?: string | null;
};

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
    details: z.string().trim().max(2000).optional().default(""),
    paymentMethod: z.literal("monobank").optional().default("monobank"),
    amountKopiyky: z.number().finite().optional(),
    invoiceId: z.string().trim().max(128).optional().nullable(),
  })
  .strict();

function parseBody(raw: unknown): { ok: true; data: ConfirmBody } | { ok: false; error: string } {
  const parsed = confirmBodySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Некоректне тіло запиту" };

  const obj = parsed.data;
  const visitDateKey = obj.visitDateKey;
  const visitDate = parseVisitDateKey(visitDateKey);
  if (!visitDate) return { ok: false, error: "Некоректна дата візиту" };

  const seen = new Set<string>();
  for (const id of obj.seatIds) {
    if (!isAllowedPoolSeatId(id) || seen.has(id)) {
      return { ok: false, error: "Некоректний список місць" };
    }
    seen.add(id);
  }

  const createdAtIso =
    obj.createdAtIso && !Number.isNaN(new Date(obj.createdAtIso).getTime())
      ? obj.createdAtIso
      : new Date().toISOString();
  const amountKopiyky =
    typeof obj.amountKopiyky === "number" ? Math.max(100, Math.round(obj.amountKopiyky)) : 100;
  const details = obj.details;
  const invoiceId = obj.invoiceId?.trim() ? obj.invoiceId.trim() : null;

  return {
    ok: true,
    data: {
      createdAtIso,
      visitDateKey,
      seatIds: [...seen],
      fullName: obj.fullName,
      phone: obj.phone,
      details,
      paymentMethod: "monobank",
      amountKopiyky,
      invoiceId,
    },
  };
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний JSON" }, { status: 400 });
  }

  const parsed = parseBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { visitDateKey, seatIds, fullName, phone, details, createdAtIso, amountKopiyky, invoiceId } =
    parsed.data;
  const visitDate = parseVisitDateKey(visitDateKey);
  if (!visitDate) {
    return NextResponse.json({ error: "Некоректна дата візиту" }, { status: 400 });
  }
  const seatsJson = Object.fromEntries(seatIds.map((id) => [id, true]));

  try {
    const ds = await getDataSource();
    const repo = getBookingRequestRepository(ds);

    if (invoiceId) {
      const existing = await repo.findOne({
        where: { monobankInvoiceId: invoiceId },
      });
      if (existing) {
        existing.paymentStatus = "paid";
        existing.paidAt = new Date(createdAtIso);
        existing.amountKopiyky = amountKopiyky;
        existing.visitDate = visitDate;
        existing.fullName = fullName || existing.fullName || "Без імені";
        existing.phone = phone;
        existing.details = details || existing.details || null;
        existing.seatsJson = seatsJson;
        existing.paymentPayloadJson = {
          ...(existing.paymentPayloadJson ?? {}),
          source: "pay_return_client",
          createdAtIso,
          visitDateKey,
          seatIds,
          amountKopiyky,
        };
        await repo.save(existing);
        notifySeatSyncBooked({ visitDateKey, seatIds });
        return NextResponse.json({ ok: true, id: existing.id, updated: true });
      }
    }

    const row = repo.create({
      visitDate,
      fullName: fullName || "Без імені",
      phone,
      paymentMethod: "monobank",
      paymentStatus: "paid",
      monobankInvoiceId: invoiceId,
      amountKopiyky,
      paidAt: new Date(createdAtIso),
      details: details || null,
      seatsJson,
      paymentPayloadJson: {
        source: "pay_return_client",
        createdAtIso,
        visitDateKey,
        seatIds,
        amountKopiyky,
      },
    });
    await repo.save(row);
    notifySeatSyncBooked({ visitDateKey, seatIds });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "db_error";
    return NextResponse.json(
      { error: `Не вдалося передати оплату в адмінку: ${message}` },
      { status: 503 },
    );
  }
}
