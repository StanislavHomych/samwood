import "reflect-metadata";
import { NextResponse } from "next/server";
import { loadOccupiedSeatIdsForVisitDay } from "@/lib/booking/load-occupied-seat-ids";
import { parseVisitDateKey } from "@/lib/dates/visit-date-key";

export const runtime = "nodejs";

/** Підтверджені заявки з БД для дня візиту (ключ `YYYY-MM-DD`). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date")?.trim() ?? "";
  const day = parseVisitDateKey(date);
  if (!day) {
    return NextResponse.json({ error: "Невірна дата" }, { status: 400 });
  }

  try {
    const ids = await loadOccupiedSeatIdsForVisitDay(day);
    return NextResponse.json({
      date,
      seatIds: [...ids].sort((a, b) => a.localeCompare(b, "uk")),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "db_error";
    return NextResponse.json(
      { error: `Не вдалося завантажити зайнятість: ${message}` },
      { status: 503 },
    );
  }
}
