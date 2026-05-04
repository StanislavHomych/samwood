"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Помилка ${res.status}`);
        return;
      }
      router.push("/admin/bookings");
      router.refresh();
    } catch {
      setError("Не вдалося з’єднатися з сервером.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12 font-[family-name:var(--font-montserrat)]">
      <h1 className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-[#152025]">
        Адмін · вхід
      </h1>
      <p className="mt-2 text-sm font-medium text-[#3d4f5a]">
        Пароль задається в змінній середовища{" "}
        <code className="rounded bg-zinc-200/90 px-1.5 py-0.5 text-xs">
          ADMIN_PASSWORD
        </code>
        .
      </p>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#354652]">
            Пароль
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-[15px] font-semibold text-zinc-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-900/15"
            required
          />
        </label>
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl border border-teal-900 bg-teal-800 py-3 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-teal-900 disabled:opacity-50"
        >
          {pending ? "Вхід…" : "Увійти"}
        </button>
      </form>
    </div>
  );
}
