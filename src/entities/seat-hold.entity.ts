import "reflect-metadata";
import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

/**
 * Тимчасове «утримання» місця (draft hold) для полінг-синхронізації.
 * Кожна вкладка періодично продовжує `expiresAt` (heartbeat). Закрита вкладка
 * перестає слати heartbeat — рядок «протухає» і місце звільняється для інших.
 * Це лише підказка для UI; остаточна перевірка зайнятості — при збереженні заявки.
 */
@Entity("seat_holds")
@Unique(["visitDate", "seatId"])
export class SeatHold {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** Календарний день візиту, ключ `YYYY-MM-DD`. */
  @Column({ type: "date" })
  visitDate!: string;

  @Column({ type: "varchar", length: 40 })
  seatId!: string;

  /** Ідентифікатор вкладки/клієнта, що утримує місце. */
  @Column({ type: "varchar", length: 64 })
  clientId!: string;

  /** Доки утримання вважається активним (продовжується heartbeat-ом). */
  @Column({ type: "timestamptz" })
  expiresAt!: Date;
}
