"use server";

import "reflect-metadata";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionValid,
} from "@/lib/admin/admin-session";
import { loadOccupiedSeatIdsForVisitDay } from "@/lib/booking/load-occupied-seat-ids";
import { isAllowedPoolSeatId, MAX_SEATS_PER_BOOKING } from "@/lib/booking/seat-id";
import {
  createConfirmedBookingWithSeats,
  SeatConflictError,
} from "@/lib/booking/seat-bookings";
import { releaseHoldsForSeats } from "@/lib/booking/seat-holds";
import { getBookingRequestRepository, getDataSource } from "@/lib/db";
import { parseVisitDateKey } from "@/lib/dates/visit-date-key";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DeleteBookingResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteBookingRequest(id: string): Promise<DeleteBookingResult> {
  const cookieStore = await cookies();
  if (!isAdminSessionValid(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  const trimmed = id.trim();
  if (!UUID_RE.test(trimmed)) {
    return { ok: false, error: "Невірний ідентифікатор заявки" };
  }

  try {
    const ds = await getDataSource();
    const repo = getBookingRequestRepository(ds);
    const result = await repo.delete(trimmed);
    if (!result.affected) {
      return { ok: false, error: "Запис не знайдено" };
    }
    revalidatePath("/admin/bookings");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "db_error";
    return { ok: false, error: message };
  }
}

export type CreateAdminBookingInput = {
  visitDateKey: string;
  seatIds: string[];
  fullName?: string;
  phone?: string;
  details?: string;
};

export type CreateAdminBookingResult =
  | { ok: true; id: string }
  | { ok: false; error: string; clashSeatIds?: string[] };

/**
 * Ручна бронь адмінки БЕЗ оплати: займає обрані місця на день візиту
 * (paymentMethod `admin`, paymentStatus `none`, сума 0). Місця закріплюються
 * атомарно тим самим шляхом, що й готівкові заявки, тож подвійне бронювання
 * неможливе. Лист клієнту не надсилаємо (це внутрішня бронь).
 */
export async function createAdminBooking(
  input: CreateAdminBookingInput,
): Promise<CreateAdminBookingResult> {
  const cookieStore = await cookies();
  if (!isAdminSessionValid(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  const visitDateKey =
    typeof input.visitDateKey === "string" ? input.visitDateKey.trim() : "";
  const visitDate = parseVisitDateKey(visitDateKey);
  if (!visitDate) {
    return { ok: false, error: "Оберіть коректну дату візиту" };
  }

  // Валідація списку місць (тільки реальні id карти, без дублікатів).
  const seen = new Set<string>();
  for (const id of Array.isArray(input.seatIds) ? input.seatIds : []) {
    if (!isAllowedPoolSeatId(id)) {
      return { ok: false, error: "Некоректний список місць" };
    }
    seen.add(id);
  }
  const seatIds = [...seen];
  if (seatIds.length === 0) {
    return { ok: false, error: "Оберіть хоча б одне місце на карті" };
  }
  if (seatIds.length > MAX_SEATS_PER_BOOKING) {
    return {
      ok: false,
      error: `Максимум ${MAX_SEATS_PER_BOOKING} місць за одну бронь`,
    };
  }

  const fullName = (input.fullName ?? "").trim() || "Бронь адміністратора";
  const phone = (input.phone ?? "").trim();
  const details = (input.details ?? "").trim();

  try {
    const ds = await getDataSource();

    // Дружня рання перевірка (зрозумілий список зайнятих місць).
    const taken = await loadOccupiedSeatIdsForVisitDay(visitDateKey);
    const clash = seatIds.filter((id) => taken.has(id));
    if (clash.length > 0) {
      return {
        ok: false,
        error: "Частина місць уже зайнята. Оновіть карту й оберіть інші.",
        clashSeatIds: clash,
      };
    }

    const { id } = await createConfirmedBookingWithSeats(ds, {
      visitDate,
      visitDateKey,
      fullName,
      phone,
      email: null,
      paymentMethod: "admin",
      paymentStatus: "none",
      amountKopiyky: 0,
      details: details || null,
      seatIds,
    });

    await releaseHoldsForSeats(visitDateKey, seatIds).catch(() => {});

    revalidatePath("/admin/bookings");
    return { ok: true, id };
  } catch (e) {
    if (e instanceof SeatConflictError) {
      return {
        ok: false,
        error: "Частина місць щойно зайнята. Оновіть карту й оберіть інші.",
        clashSeatIds: e.seatIds,
      };
    }
    const message = e instanceof Error ? e.message : "db_error";
    return { ok: false, error: message };
  }
}
