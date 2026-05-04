/**
 * Повідомляє окремий WebSocket-сервер про нове підтверджене бронювання,
 * щоб інші вкладки оновили «заброньовані» місця без опитування БД.
 */
export function notifySeatSyncBooked(payload: {
  visitDateKey: string;
  seatIds: string[];
}): void {
  const base = process.env.SEAT_SYNC_URL?.trim();
  const secret = process.env.SEAT_SYNC_SECRET?.trim();
  if (!base || !secret || payload.seatIds.length === 0) return;

  const url = `${base.replace(/\/$/, "")}/internal/booked`;
  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    /* не блокуємо відповідь клієнту */
  });
}
