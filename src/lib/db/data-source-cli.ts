/**
 * Конфіг для TypeORM CLI (міграції). Не використовуйте в Next runtime — лише `npm run db:*`.
 */
import "reflect-metadata";
import path from "node:path";
import { config } from "dotenv";
import { DataSource } from "typeorm";
import { BookingRequest } from "../../entities/booking-request.entity";
import { CreateBookingRequests1740000000000 } from "./migrations/1740000000000-CreateBookingRequests";
import { AddMonobankPaymentFields1740000000002 } from "./migrations/1740000000002-AddMonobankPaymentFields";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required for TypeORM CLI");
}

export default new DataSource({
  type: "postgres",
  url,
  entities: [BookingRequest],
  migrations: [
    CreateBookingRequests1740000000000,
    AddMonobankPaymentFields1740000000002,
  ],
  synchronize: false,
  logging: true,
});
