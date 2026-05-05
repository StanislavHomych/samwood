import "reflect-metadata";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionValid,
} from "@/lib/admin/admin-session";
import { getBookingRequestRepository, getDataSource } from "@/lib/db";
import { formatVisitDateKey, parseVisitDateKey } from "@/lib/dates/visit-date-key";
import { BookingsFilterBar } from "./bookings-filter-bar";
import { DeleteBookingButton } from "./delete-booking-button";

type PageProps = {
  searchParams: Promise<{ date?: string; payment?: string }>;
};

const PAYMENT_FILTER_VALUES = ["cash", "on_site", "monobank"] as const;
type PaymentFilterValue = (typeof PAYMENT_FILTER_VALUES)[number];

function isPaymentFilterValue(s: string): s is PaymentFilterValue {
  return (PAYMENT_FILTER_VALUES as readonly string[]).includes(s);
}

function labelPayment(m: string) {
  const map: Record<string, string> = {
    cash: "Готівка",
    on_site: "Термінал / на місці",
    monobank: "Monobank",
  };
  return map[m] ?? m;
}

function labelPaymentStatus(s: string | null) {
  if (!s) return "—";
  const map: Record<string, string> = {
    paid: "Оплачено",
    requested: "Очікує",
  };
  return map[s] ?? s;
}

function bookingsListHref(parts: { date?: string; payment?: string }) {
  const p = new URLSearchParams();
  if (parts.date) p.set("date", parts.date);
  if (parts.payment) p.set("payment", parts.payment);
  const q = p.toString();
  return q ? `/admin/bookings?${q}` : "/admin/bookings";
}

function telHref(phone: string): string {
  const cleaned = phone.replace(/[\s().-]/g, "");
  return cleaned ? `tel:${cleaned}` : "#";
}

function seatsPreview(
  json: Record<string, boolean> | null,
  max = 96,
): string {
  if (!json || typeof json !== "object") return "—";
  const keys = Object.keys(json)
    .filter((k) => json[k])
    .sort((a, b) => a.localeCompare(b, "uk"));
  if (keys.length === 0) return "—";
  const s = keys.join(", ");
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  if (!isAdminSessionValid(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  const sp = await searchParams;
  const dateKey = typeof sp.date === "string" ? sp.date.trim() : "";
  const day = dateKey ? parseVisitDateKey(dateKey) : null;

  const paymentRaw =
    typeof sp.payment === "string" ? sp.payment.trim().toLowerCase() : "";
  const paymentFilter = isPaymentFilterValue(paymentRaw)
    ? paymentRaw
    : null;

  const ds = await getDataSource();
  const repo = getBookingRequestRepository(ds);

  const qb = repo
    .createQueryBuilder("b")
    .orderBy("b.visitDate", "DESC")
    .addOrderBy("b.createdAt", "DESC");

  if (day) {
    const end = new Date(day);
    end.setDate(end.getDate() + 1);
    qb.andWhere("b.visitDate >= :dayStart", { dayStart: day }).andWhere(
      "b.visitDate < :dayEnd",
      { dayEnd: end },
    );
  }

  if (paymentFilter) {
    qb.andWhere("b.paymentMethod = :paymentMethod", {
      paymentMethod: paymentFilter,
    });
  }

  const rows = await qb.getMany();

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" }).format(d);

  const fmtDateTime = (d: Date) =>
    new Intl.DateTimeFormat("uk-UA", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);

  const today = formatVisitDateKey(new Date());

  return (
    <div className="space-y-8 font-[family-name:var(--font-montserrat)]">
      <div className="space-y-4 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-zinc-900">
            Заявки на бронювання
          </h1>
          <p className="mt-1 text-sm font-medium text-zinc-600">
            Таблиця з бази. Можна фільтрувати за датою візиту та способом оплати.
          </p>
        </div>
        <BookingsFilterBar
          key={`${dateKey}|${paymentFilter ?? ""}`}
          defaultDate={day ? dateKey : ""}
          defaultPayment={paymentFilter ?? ""}
          clearDateHref={bookingsListHref({
            payment: paymentFilter ?? undefined,
          })}
          clearPaymentHref={bookingsListHref({
            date: day ? dateKey : undefined,
          })}
          showClearDate={Boolean(day)}
          showClearPayment={Boolean(paymentFilter)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full min-w-[1150px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
              <th className="whitespace-nowrap px-4 py-3">Створено заявку</th>
              <th className="whitespace-nowrap px-4 py-3">Дата візиту</th>
              <th className="min-w-[120px] px-4 py-3">Ім&apos;я</th>
              <th className="whitespace-nowrap px-4 py-3">Телефон</th>
              <th className="whitespace-nowrap px-4 py-3">Оплата</th>
              <th className="whitespace-nowrap px-4 py-3">Статус</th>
              <th className="whitespace-nowrap px-4 py-3">Invoice</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Сума</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Місць</th>
              <th className="min-w-[200px] px-4 py-3">Місця</th>
              <th className="min-w-[140px] px-4 py-3">Деталі</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Дії</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-14 text-center text-sm font-medium text-zinc-500"
                >
                  Немає заявок для обраних умов.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const seatKeys = r.seatsJson
                  ? Object.keys(r.seatsJson).filter((k) => r.seatsJson![k])
                  : [];
                return (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-100 odd:bg-white even:bg-zinc-50/70 transition hover:bg-teal-50/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-800">
                      {fmtDateTime(r.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-900">
                      {fmtDate(r.visitDate)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-900">
                      {r.fullName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-700">
                      {r.phone.trim() ? (
                        <a
                          href={telHref(r.phone)}
                          className="font-semibold text-teal-800 underline-offset-2 hover:text-teal-950 hover:underline"
                        >
                          {r.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-700">
                      {labelPayment(r.paymentMethod)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-700">
                      {labelPaymentStatus(r.paymentStatus)}
                    </td>
                    <td
                      className="max-w-[180px] truncate px-4 py-3 font-mono text-[11px] text-zinc-700"
                      title={r.monobankInvoiceId ?? ""}
                    >
                      {r.monobankInvoiceId ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-zinc-900">
                      {typeof r.amountKopiyky === "number"
                        ? (r.amountKopiyky / 100).toLocaleString("uk-UA", {
                            style: "currency",
                            currency: "UAH",
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-900">
                      {seatKeys.length}
                    </td>
                    <td
                      className="max-w-[300px] px-4 py-3 font-mono text-[11px] leading-snug text-zinc-700"
                      title={seatsPreview(r.seatsJson, 4000)}
                    >
                      {seatsPreview(r.seatsJson)}
                    </td>
                    <td className="max-w-[180px] px-4 py-3 text-xs leading-snug text-zinc-600">
                      {r.details ? (
                        <span className="line-clamp-3" title={r.details}>
                          {r.details}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right align-middle">
                      <DeleteBookingButton bookingId={r.id} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs font-medium text-zinc-500">
        Записів: {rows.length}
        {day ? (
          <>
            {" "}
            · фільтр: дата візиту{" "}
            <span className="font-semibold text-zinc-700">{dateKey}</span>
          </>
        ) : (
          <> · усі дні (сьогодні за календарем: {today})</>
        )}
        {paymentFilter ? (
          <>
            {" "}
            · оплата:{" "}
            <span className="font-semibold text-zinc-700">
              {labelPayment(paymentFilter)}
            </span>
          </>
        ) : (
          <> · усі способи оплати</>
        )}
        .
      </p>
    </div>
  );
}
