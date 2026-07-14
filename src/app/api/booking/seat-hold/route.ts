import "reflect-metadata";
import { NextResponse } from "next/server";
import { refreshSeatHolds } from "@/lib/booking/seat-holds";
import { isAllowedPoolSeatId, MAX_SEATS_PER_BOOKING } from "@/lib/booking/seat-id";
import { parseVisitDateKey } from "@/lib/dates/visit-date-key";

export const runtime = "nodejs";

/**
 * Heartbeat утримання обраних місць (draft hold). Браузер шле періодично
 * та при зміні вибору. Тіло: `{ date, clientId, seatIds }`.
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний JSON" }, { status: 400 });
  }

  const body = (raw ?? {}) as {
    date?: unknown;
    clientId?: unknown;
    seatIds?: unknown;
  };
  const dateKey = typeof body.date === "string" ? body.date.trim() : "";
  const clientId =
    typeof body.clientId === "string" ? body.clientId.trim().slice(0, 64) : "";
  if (!parseVisitDateKey(dateKey)) {
    return NextResponse.json({ error: "Невірна дата" }, { status: 400 });
  }
  if (!clientId) {
    return NextResponse.json({ error: "Немає clientId" }, { status: 400 });
  }

  const seen = new Set<string>();
  if (Array.isArray(body.seatIds)) {
    for (const id of body.seatIds) {
      if (typeof id === "string" && isAllowedPoolSeatId(id)) seen.add(id);
      if (seen.size >= MAX_SEATS_PER_BOOKING) break;
    }
  }

  try {
    await refreshSeatHolds(dateKey, clientId, [...seen]);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("[seat-hold]", e);
    return NextResponse.json({ error: "db_error" }, { status: 503 });
  }
}
