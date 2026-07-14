import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSeatHolds1740000000003 implements MigrationInterface {
  name = "CreateSeatHolds1740000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "seat_holds" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "visitDate" date NOT NULL,
        "seatId" character varying(40) NOT NULL,
        "clientId" character varying(64) NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "PK_seat_holds" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_seat_holds_visit_seat" UNIQUE ("visitDate", "seatId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_seat_holds_visit_expires"
        ON "seat_holds" ("visitDate", "expiresAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "seat_holds"`);
  }
}
