import "reflect-metadata";
import { NextResponse } from "next/server";
import { releaseSeatHolds } from "@/lib/booking/seat-holds";
import { parseVisitDateKey } from "@/lib/dates/visit-date-key";

export const runtime = "nodejs";

/**
 * Звільнити всі утримання клієнта (закриття вкладки / зміна дати).
 * POST (а не DELETE), щоб працювало через `navigator.sendBeacon`.
 * Тіло: `{ date, clientId }`.
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Некоректний JSON" }, { status: 400 });
  }

  const body = (raw ?? {}) as { date?: unknown; clientId?: unknown };
  const dateKey = typeof body.date === "string" ? body.date.trim() : "";
  const clientId =
    typeof body.clientId === "string" ? body.clientId.trim().slice(0, 64) : "";
  if (!parseVisitDateKey(dateKey) || !clientId) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    await releaseSeatHolds(dateKey, clientId);
  } catch (e) {
    console.error("[seat-hold/release]", e);
  }
  return new NextResponse(null, { status: 204 });
}
