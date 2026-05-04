import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSeatBookings1740000000001 implements MigrationInterface {
  name = "CreateSeatBookings1740000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "seat_bookings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "bookingRequestId" uuid NOT NULL,
        "visitDate" date NOT NULL,
        "seatId" character varying(40) NOT NULL,
        CONSTRAINT "PK_seat_bookings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_seat_bookings_booking" FOREIGN KEY ("bookingRequestId")
          REFERENCES "booking_requests"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_seat_bookings_visit_seat" UNIQUE ("visitDate", "seatId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_seat_bookings_visitDate" ON "seat_bookings" ("visitDate")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "seat_bookings"`);
  }
}
