import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionValid,
} from "@/lib/admin/admin-session";
import { todayVisitDateKey } from "@/lib/dates/visit-date-key";
import { AdminNewBooking } from "./admin-new-booking";

export default async function AdminNewBookingPage() {
  const cookieStore = await cookies();
  if (!isAdminSessionValid(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }
  // Канонічне «сьогодні» в бізнес-таймзоні (Europe/Kyiv) — щоб не було
  // розбіжності SSR/клієнт біля опівночі й день рахувався коректно.
  return <AdminNewBooking todayKey={todayVisitDateKey()} />;
}
