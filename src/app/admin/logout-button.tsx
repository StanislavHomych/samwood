import { adminLogout } from "./actions";

export function AdminLogoutButton() {
  return (
    <form action={adminLogout}>
      <button
        type="submit"
        className="h-9 shrink-0 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50"
      >
        Вийти
      </button>
    </form>
  );
}
