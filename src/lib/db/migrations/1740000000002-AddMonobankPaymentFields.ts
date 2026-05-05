import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMonobankPaymentFields1740000000002
  implements MigrationInterface
{
  name = "AddMonobankPaymentFields1740000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "booking_requests"
      ADD COLUMN "paymentStatus" character varying(32),
      ADD COLUMN "monobankInvoiceId" character varying(128),
      ADD COLUMN "amountKopiyky" integer,
      ADD COLUMN "paidAt" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN "paymentPayloadJson" jsonb
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_booking_requests_monobankInvoiceId"
      ON "booking_requests" ("monobankInvoiceId")
      WHERE "monobankInvoiceId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_booking_requests_monobankInvoiceId"`,
    );
    await queryRunner.query(`
      ALTER TABLE "booking_requests"
      DROP COLUMN "paymentPayloadJson",
      DROP COLUMN "paidAt",
      DROP COLUMN "amountKopiyky",
      DROP COLUMN "monobankInvoiceId",
      DROP COLUMN "paymentStatus"
    `);
  }
}
