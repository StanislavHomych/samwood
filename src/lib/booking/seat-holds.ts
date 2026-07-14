import "reflect-metadata";
import { getDataSource } from "@/lib/db";

/**
 * Утримання місць (draft holds) для полінг-синхронізації — заміна WebSocket-серверу.
 * Усе тримається в Postgres (Neon/Supabase), тож працює на serverless (Vercel).
 *
 * `expiresAt` продовжується heartbeat-ом з браузера. Якщо вкладку закрили —
 * heartbeat зникає, рядок «протухає» (expiresAt < now()) і місце знову вільне.
 */

/** Скільки утримання живе без heartbeat. Має бути > інтервалу опитування браузера. */
const HOLD_TTL_MS = Number(process.env.SEAT_HOLD_TTL_MS) || 30_000;

/** Місця, які зараз утримують ІНШІ клієнти (активні, не протухлі). */
export async function loadHeldSeatIds(
  visitDateKey: string,
  excludeClientId: string,
): Promise<Set<string>> {
  const ds = await getDataSource();
  const rows: Array<{ seatId: string }> = await ds.query(
    `SELECT "seatId" FROM "seat_holds"
       WHERE "visitDate" = $1
         AND "expiresAt" > now()
         AND "clientId" <> $2`,
    [visitDateKey, excludeClientId],
  );
  return new Set(rows.map((r) => r.seatId));
}

/**
 * Heartbeat: для (день, клієнт) робить набір утримань рівно `seatIds`.
 * Знімає свої утримання зі знятих місць; ставить/продовжує на обраних.
 * Чуже активне утримання не перехоплює (ON CONFLICT … WHERE).
 */
export async function refreshSeatHolds(
  visitDateKey: string,
  clientId: string,
  seatIds: string[],
): Promise<void> {
  const ds = await getDataSource();

  if (seatIds.length === 0) {
    await ds.query(
      `DELETE FROM "seat_holds" WHERE "visitDate" = $1 AND "clientId" = $2`,
      [visitDateKey, clientId],
    );
    return;
  }

  // Зняти свої утримання з місць, які більше не обрані.
  await ds.query(
    `DELETE FROM "seat_holds"
       WHERE "visitDate" = $1 AND "clientId" = $2 AND NOT ("seatId" = ANY($3))`,
    [visitDateKey, clientId, seatIds],
  );

  const expiresAt = new Date(Date.now() + HOLD_TTL_MS);
  for (const seatId of seatIds) {
    await ds.query(
      `INSERT INTO "seat_holds" ("visitDate", "seatId", "clientId", "expiresAt")
         VALUES ($1, $2, $3, $4)
       ON CONFLICT ("visitDate", "seatId") DO UPDATE
         SET "clientId" = EXCLUDED."clientId", "expiresAt" = EXCLUDED."expiresAt"
         WHERE "seat_holds"."clientId" = EXCLUDED."clientId"
            OR "seat_holds"."expiresAt" < now()`,
      [visitDateKey, seatId, clientId, expiresAt],
    );
  }
}

/** Звільнити всі утримання клієнта (закрив вкладку / змінив дату). */
export async function releaseSeatHolds(
  visitDateKey: string,
  clientId: string,
): Promise<void> {
  const ds = await getDataSource();
  await ds.query(
    `DELETE FROM "seat_holds" WHERE "visitDate" = $1 AND "clientId" = $2`,
    [visitDateKey, clientId],
  );
}

/** Прибрати утримання для місць, що стали підтвердженою бронею (будь-чиї). */
export async function releaseHoldsForSeats(
  visitDateKey: string,
  seatIds: string[],
): Promise<void> {
  if (seatIds.length === 0) return;
  const ds = await getDataSource();
  await ds.query(
    `DELETE FROM "seat_holds" WHERE "visitDate" = $1 AND "seatId" = ANY($2)`,
    [visitDateKey, seatIds],
  );
}
