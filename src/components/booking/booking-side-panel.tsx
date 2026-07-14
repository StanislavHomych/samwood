"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { formatSeatLineUk, priceForSeatId } from "@/lib/pool/seat-pricing";
import { swatchForSeatId } from "@/lib/pool/seat-zone-palette";

export type PaymentMethod = "monobank" | "cash" | "on_site";
const PAYMENT_RECEIPT_STORAGE_KEY = "rivera_payment_receipt_v1";

type BookingSidePanelProps = {
  selectedDate: Date;
  /** Ключ дня візиту YYYY-MM-DD для API */
  visitDateKey: string;
  /** Відкрити календар (дата зберігається, можна обрати інший день або той самий) */
  onEditDate: () => void;
  selectedSeatIds: string[];
  seatsTotalUah: number;
  onClearSeatSelection: () => void;
  onBookingSaved?: (seatIds: string[]) => void;
};

const payments: { id: PaymentMethod; title: string; hint: string }[] = [
  {
    id: "monobank",
    title: "Онлайн-оплата",
    hint: "Картка, Apple Pay або Google Pay — на сторінці вашого банку",
  },
  { id: "cash", title: "Готівка", hint: "Оплата при заїзді на рецепції" },
  {
    id: "on_site",
    title: "На місці",
    hint: "Карткою або готівкою безпосередньо у Samwood",
  },
];

function formatDateUk(d: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Не показувати користувачу технічні деталі (змінні середовища, внутрішні коди). */
function friendlyClientError(raw: string | null): string {
  if (!raw?.trim()) return "Щось пішло не так. Спробуйте ще раз.";
  const r = raw;
  if (
    /MONOBANK|NEXT_PUBLIC|DATABASE_URL|\.env|npm run|SEAT_SYNC|VERCEL_URL/i.test(r)
  ) {
    return "Сервіс тимчасово недоступний. Спробуйте пізніше або оберіть інший спосіб оплати.";
  }
  return r;
}

export function BookingSidePanel({
  selectedDate,
  visitDateKey,
  onEditDate,
  selectedSeatIds,
  seatsTotalUah,
  onClearSeatSelection,
  onBookingSaved,
}: BookingSidePanelProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("monobank");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [payPending, setPayPending] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedSeatIds.length === 0) return;
    setPayError(null);

    if (payment !== "monobank") {
      setPayPending(true);
      try {
        const res = await fetch("/api/booking/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitDateKey,
            seatIds: selectedSeatIds,
            fullName: name,
            phone,
            details,
            paymentMethod: payment,
          }),
        });
        const data: unknown = await res.json().catch(() => ({}));
        const err =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : null;
        if (!res.ok) {
          setPayError(friendlyClientError(err));
          return;
        }
        onBookingSaved?.(selectedSeatIds);
        setSubmitted(true);
      } catch {
        setPayError(
          "Не вдалося надіслати заявку. Перевірте з’єднання з інтернетом і спробуйте ще раз.",
        );
      } finally {
        setPayPending(false);
      }
      return;
    }

    setPayPending(true);
    try {
      const res = await fetch("/api/booking/monobank-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitDateKey,
          seatIds: selectedSeatIds,
          fullName: name,
          phone,
          details,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      const err =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : null;
      if (!res.ok) {
        setPayError(friendlyClientError(err));
        return;
      }
      const pageUrl =
        typeof data === "object" &&
        data !== null &&
        "pageUrl" in data &&
        typeof (data as { pageUrl: unknown }).pageUrl === "string"
          ? (data as { pageUrl: string }).pageUrl
          : null;
      const amountKopiyky =
        typeof data === "object" &&
        data !== null &&
        "amountKopiyky" in data &&
        typeof (data as { amountKopiyky: unknown }).amountKopiyky === "number"
          ? (data as { amountKopiyky: number }).amountKopiyky
          : Math.round(seatsTotalUah * 100);
      const invoiceId =
        typeof data === "object" &&
        data !== null &&
        "invoiceId" in data &&
        typeof (data as { invoiceId: unknown }).invoiceId === "string"
          ? (data as { invoiceId: string }).invoiceId
          : null;
      if (pageUrl) {
        try {
          window.sessionStorage.setItem(
            PAYMENT_RECEIPT_STORAGE_KEY,
            JSON.stringify({
              createdAtIso: new Date().toISOString(),
              visitDateKey,
              seatIds: selectedSeatIds,
              fullName: name,
              phone,
              details,
              paymentMethod: "monobank",
              amountKopiyky,
              invoiceId,
            }),
          );
        } catch {
          // If storage is unavailable, still continue to payment page.
        }
        window.location.assign(pageUrl);
        return;
      }
      setPayError("Сервер не повернув посилання на оплату.");
    } catch {
      setPayError(
        "Не вдалося перейти до оплати. Перевірте з’єднання з інтернетом і спробуйте ще раз.",
      );
    } finally {
      setPayPending(false);
    }
  }

  return (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm lg:h-full"
    >
        <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 font-[family-name:var(--font-montserrat)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 sm:text-[11px] sm:tracking-[0.22em]">
                Бронювання
              </p>
              <p className="mt-1.5 text-lg font-semibold leading-tight text-slate-900 sm:mt-2 sm:text-xl sm:leading-snug">
                Дані відвідувача
              </p>
              <p className="mt-1 truncate text-[11px] font-semibold capitalize text-slate-700 sm:text-[12px]">
                {formatDateUk(selectedDate)}
              </p>
            </div>
            <button
              type="button"
              onClick={onEditDate}
              className="shrink-0 rounded-2xl border border-slate-300 bg-white px-3 py-2 font-[family-name:var(--font-montserrat)] text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 sm:tracking-[0.16em]"
            >
              Календар
            </button>
          </div>
        </div>

        <div className="min-h-0 min-w-0 overflow-x-hidden px-4 py-5 font-[family-name:var(--font-montserrat)] sm:px-5 sm:py-6 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-center"
            >
              <p className="text-2xl font-semibold text-slate-900">
                Дякуємо!
              </p>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-700">
                Заявку збережено. Найближчим часом з вами зв&apos;яжеться
                адміністратор Samwood.
              </p>
            </motion.div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                    Обрані місця
                  </p>
                  {selectedSeatIds.length > 0 ? (
                    <button
                      type="button"
                      onClick={onClearSeatSelection}
                      className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-teal-800 underline-offset-2 transition hover:text-teal-950 hover:underline"
                    >
                      Скинути
                    </button>
                  ) : null}
                </div>
                {selectedSeatIds.length === 0 ? (
                  <p className="mt-2 text-[12px] font-semibold leading-snug text-slate-600">
                    Натисніть номери на карті — тут з&apos;явиться список і сума.
                  </p>
                ) : (
                  <>
                    <ul className="mt-2 flex min-h-0 max-h-[min(40vh,14rem)] flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
                      {selectedSeatIds.map((id) => (
                        <li
                          key={id}
                          className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-2 text-[12px] last:border-b-0 last:pb-0"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-3.5 w-3.5 shrink-0 rounded-md border border-black/10"
                              style={{ backgroundColor: swatchForSeatId(id) }}
                              aria-hidden
                            />
                            <span className="font-semibold leading-snug text-slate-900">
                              {formatSeatLineUk(id)}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums font-semibold text-slate-700">
                            {priceForSeatId(id).toLocaleString("uk-UA")} ₴
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-slate-200/90 pt-3">
                      <span className="text-[15px] font-semibold text-slate-900">
                        Загальна ціна
                      </span>
                      <span className="text-[15px] font-semibold tabular-nums text-slate-900">
                        {seatsTotalUah.toLocaleString("uk-UA", {
                          style: "currency",
                          currency: "UAH",
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                  Ім&apos;я
                </span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Введіть ім'я та прізвище"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none transition placeholder:text-xs placeholder:font-medium placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                  Телефон
                </span>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+380 …"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none transition placeholder:text-xs placeholder:font-medium placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
                />
              </label>

              <div>
                <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                  Спосіб оплати
                </span>
                <div className="flex flex-col gap-2">
                  {payments.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPayment(p.id)}
                      className={[
                        "flex flex-col items-start rounded-2xl border-2 px-4 py-3 text-left transition",
                        payment === p.id
                          ? "border-teal-700 bg-teal-50/80 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <span className="text-[14px] font-semibold text-slate-900">
                        {p.title}
                      </span>
                      <span className="mt-1 text-[11px] font-semibold text-slate-600">
                        {p.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                  Деталі (необов&apos;язково)
                </span>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  placeholder="За бажанням: зона, час заїзду…"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-slate-900 outline-none transition placeholder:text-xs placeholder:font-medium placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
                />
              </label>

              {payError ? (
                <p className="rounded-2xl border border-red-800/35 bg-red-950/10 px-3 py-2 text-center text-[12px] font-semibold text-red-950">
                  {payError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={selectedSeatIds.length === 0 || payPending}
                className={[
                  "mt-2 rounded-2xl border py-3.5 text-[11px] font-semibold uppercase tracking-[0.28em] shadow-sm transition",
                  selectedSeatIds.length === 0 || payPending
                    ? "cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500"
                    : "border-teal-800 bg-teal-700 text-white hover:border-teal-900 hover:bg-teal-800",
                ].join(" ")}
              >
                {payPending
                  ? payment === "monobank"
                    ? "Перехід до оплати…"
                    : "Надсилання…"
                  : payment === "monobank"
                    ? "Перейти до оплати"
                    : "Надіслати запит"}
              </button>
            </>
          )}
        </form>
        </div>
    </motion.aside>
  );
}
