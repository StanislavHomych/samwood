import "reflect-metadata";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("booking_requests")
export class BookingRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "timestamptz" })
  visitDate!: Date;

  @Column({ type: "varchar", length: 200 })
  fullName!: string;

  @Column({ type: "varchar", length: 32 })
  phone!: string;

  @Column({ type: "varchar", length: 32 })
  paymentMethod!: string;

  @Column({ type: "varchar", length: 32, nullable: true })
  paymentStatus!: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  monobankInvoiceId!: string | null;

  @Column({ type: "integer", nullable: true })
  amountKopiyky!: number | null;

  @Column({ type: "timestamptz", nullable: true })
  paidAt!: Date | null;

  @Column({ type: "text", nullable: true })
  details!: string | null;

  /** Обрані місця з карти (ключ — id місця, значення — true) */
  @Column({ type: "jsonb", nullable: true })
  seatsJson!: Record<string, boolean> | null;

  /** Сирі платіжні дані (корисно для аудиту в адмінці). */
  @Column({ type: "jsonb", nullable: true })
  paymentPayloadJson!: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
