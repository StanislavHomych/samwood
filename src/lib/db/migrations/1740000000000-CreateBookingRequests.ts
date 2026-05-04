import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBookingRequests1740000000000 implements MigrationInterface {
  name = "CreateBookingRequests1740000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "booking_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "visitDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "fullName" character varying(200) NOT NULL,
        "phone" character varying(32) NOT NULL,
        "paymentMethod" character varying(32) NOT NULL,
        "details" text,
        "seatsJson" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_booking_requests" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "booking_requests"`);
  }
}
