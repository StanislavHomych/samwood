import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomerEmail1740000000004 implements MigrationInterface {
  name = "AddCustomerEmail1740000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "booking_requests"
      ADD COLUMN "email" character varying(200),
      ADD COLUMN "confirmationEmailSentAt" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "booking_requests"
      DROP COLUMN "confirmationEmailSentAt",
      DROP COLUMN "email"
    `);
  }
}
