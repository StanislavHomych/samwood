import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { BookingRequest } from "./booking-request.entity";

@Entity("seat_bookings")
@Unique(["visitDate", "seatId"])
export class SeatBooking {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  bookingRequestId!: string;

  @ManyToOne(() => BookingRequest, { onDelete: "CASCADE" })
  @JoinColumn({ name: "bookingRequestId" })
  bookingRequest!: BookingRequest;

  /** Календарний день візиту (UTC date у БД). */
  @Column({ type: "date" })
  visitDate!: string;

  @Column({ type: "varchar", length: 40 })
  seatId!: string;
}
