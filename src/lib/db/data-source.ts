import "reflect-metadata";
import type { BookingRequest } from "@/entities/booking-request.entity";
import { DataSource, type Repository } from "typeorm";
import { BookingRequest as BookingRequestEntity } from "@/entities/booking-request.entity";

const globalForDb = globalThis as unknown as {
  __typeormDataSource?: DataSource;
};

/** Паралельні виклики `initialize()` ламають метадані / з’єднання в Next dev. */
let initPromise: Promise<DataSource> | null = null;

/** Репозиторій заявки з fallback на назву таблиці для dev/HMR edge cases. */
export function getBookingRequestRepository(
  ds: DataSource,
): Repository<BookingRequest> {
  try {
    return ds.getRepository(BookingRequestEntity) as Repository<BookingRequest>;
  } catch {
    return ds.getRepository("booking_requests") as Repository<BookingRequest>;
  }
}

function createDataSource(): DataSource {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL не задано. Додайте рядок підключення до PostgreSQL у .env.local",
    );
  }

  const isProd = process.env.NODE_ENV === "production";
  /** Увімкніть `TYPEORM_SYNC=true` лише для швидкого прототипу без міграцій (не разом з `db:migrate`). */
  const synchronize =
    !isProd &&
    (process.env.TYPEORM_SYNC === "true" ||
      process.env.TYPEORM_SYNC === "1");

  return new DataSource({
    type: "postgres",
    url,
    entities: [BookingRequestEntity],
    synchronize,
    logging:
      process.env.TYPEORM_LOGGING === "1" ||
      (!isProd && process.env.TYPEORM_LOGGING !== "0"),
  });
}

/** Один DataSource на процес (важливо для Next dev / hot reload). */
export async function getDataSource(): Promise<DataSource> {
  const existing = globalForDb.__typeormDataSource;
  if (existing?.isInitialized) return existing;

  if (!initPromise) {
    initPromise = (async () => {
      const ds = createDataSource();
      await ds.initialize();
      globalForDb.__typeormDataSource = ds;
      return ds;
    })().finally(() => {
      initPromise = null;
    });
  }

  return initPromise;
}
