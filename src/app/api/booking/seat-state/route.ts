import "reflect-metadata";
import { NextResponse } from "next/server";
import { loadOccupiedSeatIdsForVisitDay } from "@/lib/booking/load-occupied-seat-ids";
import { loadHeldSeatIds } from "@/lib/booking/seat-holds";
import { parseVisitDateKey } from "@/lib/dates/visit-date-key";

export const runtime = "nodejs";

/**
 * Полінг-стан карти для дня візиту (ключ `YYYY-MM-DD`):
 *  - bookedSeatIds — підтверджені заявки з БД;
 *  - heldSeatIds — місця, які зараз обирають ІНШІ клієнти (draft holds), без уже заброньованих.
 * `clientId` — ідентифікатор вкладки, щоб не показувати власні утримання.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateKey = searchParams.get("date")?.trim() ?? "";
  const clientId = (searchParams.get("clientId")?.trim() ?? "").slice(0, 64);
  const day = parseVisitDateKey(dateKey);
  if (!day) {
    return NextResponse.json({ error: "Невірна дата" }, { status: 400 });
  }

  try {
    const [booked, held] = await Promise.all([
      loadOccupiedSeatIdsForVisitDay(dateKey),
      loadHeldSeatIds(dateKey, clientId),
    ]);
    const heldOnly = [...held].filter((id) => !booked.has(id));
    return NextResponse.json({
      date: dateKey,
      bookedSeatIds: [...booked].sort((a, b) => a.localeCompare(b, "uk")),
      heldSeatIds: heldOnly.sort((a, b) => a.localeCompare(b, "uk")),
    });
  } catch (e) {
    console.error("[seat-state]", e);
    return NextResponse.json(
      {
        error:
          "Не вдалося завантажити стан карти. Оновіть сторінку або спробуйте пізніше.",
      },
      { status: 503 },
    );
  }
}
