"use server";

import "reflect-metadata";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionValid,
} from "@/lib/admin/admin-session";
import { getBookingRequestRepository, getDataSource } from "@/lib/db";

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
