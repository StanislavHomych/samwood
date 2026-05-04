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

  @Column({ type: "text", nullable: true })
  details!: string | null;

  /** Обрані місця з карти (ключ — id місця, значення — true) */
  @Column({ type: "jsonb", nullable: true })
  seatsJson!: Record<string, boolean> | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
