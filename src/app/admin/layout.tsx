import Link from "next/link";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionValid,
} from "@/lib/admin/admin-session";
import { AdminLogoutButton } from "./logout-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const showLogout = isAdminSessionValid(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );

  return (
    <div className="min-h-screen bg-zinc-100/90">
      <header className="border-b border-zinc-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/admin/bookings"
            className="font-[family-name:var(--font-cormorant)] text-lg font-semibold text-teal-950"
          >
            Rivera · адмін
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/bron"
              className="text-xs font-semibold uppercase tracking-wide text-zinc-600 underline-offset-2 hover:text-teal-900 hover:underline"
            >
              До бронювання
            </Link>
            {showLogout ? <AdminLogoutButton /> : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
