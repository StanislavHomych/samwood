"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export type PaymentMethod = "card" | "cash" | "on_site";

type BookingSidePanelProps = {
  selectedDate: Date;
  /** Відкрити календар (дата зберігається, можна обрати інший день або той самий) */
  onEditDate: () => void;
};

const payments: { id: PaymentMethod; title: string; hint: string }[] = [
  {
    id: "card",
    title: "Картка онлайн",
    hint: "Оплата посиланням або в додатку банку",
  },
  { id: "cash", title: "Готівка", hint: "При заїзді на рецепції" },
  {
    id: "on_site",
    title: "На місці терміналом",
    hint: "Карткою або готівкою у Rivera",
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

export function BookingSidePanel({
  selectedDate,
  onEditDate,
}: BookingSidePanelProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex w-full flex-col rounded-2xl border border-[#1f2f3a]/22 bg-[#d5e1e9] shadow-[0_18px_50px_-18px_rgba(7,13,18,0.35),inset_0_1px_0_rgba(255,255,255,0.38)]"
    >
        <div className="border-b border-[#273844]/14 bg-[linear-gradient(115deg,#bfd0d9_0%,#d9e6ee_62%,#dbe8ef_100%)] px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-cormorant)] text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-800">
                Бронювання
              </p>
              <p className="mt-2 font-[family-name:var(--font-cormorant)] text-xl font-semibold leading-snug text-[#121a20]">
                Дані відвідувача
              </p>
              <p className="mt-1 truncate text-[12px] font-semibold capitalize text-[#2c3c47]">
                {formatDateUk(selectedDate)}
              </p>
            </div>
            <button
              type="button"
              onClick={onEditDate}
              className="shrink-0 rounded-lg border border-teal-700/55 bg-[#c5d9e2] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-950 shadow-sm transition hover:border-teal-800 hover:bg-[#b9d4df]"
            >
              Календар
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 px-4 py-5 sm:px-5 sm:py-6"
        >
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-teal-800/35 bg-[#b8cfd9]/75 px-5 py-8 text-center"
            >
              <p className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-[#0f181f]">
                Дякуємо!
              </p>
              <p className="mt-3 text-sm font-medium leading-relaxed text-[#2a3840]">
                Заявку отримано (демо). Найближчим часом з вами зв&apos;яжеться
                адміністратор Rivera.
              </p>
            </motion.div>
          ) : (
            <>
              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#354652]">
                  Повне ім&apos;я
                </span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Наприклад, Олена Коваленко"
                  className="w-full rounded-xl border border-[#2a3f4d]/28 bg-[#c9d8e1]/95 px-4 py-3 text-[15px] font-semibold text-[#121a21] outline-none transition placeholder:font-semibold placeholder:text-[#5c6f7a] focus:border-teal-700 focus:bg-[#d2e4ed] focus:ring-2 focus:ring-teal-900/20"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#354652]">
                  Телефон
                </span>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+380 XX XXX XX XX"
                  className="w-full rounded-xl border border-[#2a3f4d]/28 bg-[#c9d8e1]/95 px-4 py-3 text-[15px] font-semibold text-[#121a21] outline-none transition placeholder:font-semibold placeholder:text-[#5c6f7a] focus:border-teal-700 focus:bg-[#d2e4ed] focus:ring-2 focus:ring-teal-900/20"
                />
              </label>

              <div>
                <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#354652]">
                  Спосіб оплати
                </span>
                <div className="flex flex-col gap-2">
                  {payments.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPayment(p.id)}
                      className={[
                        "flex flex-col items-start rounded-xl border px-4 py-3 text-left transition",
                        payment === p.id
                          ? "border-teal-800 bg-[#9bc4cf]/62 shadow-md ring-1 ring-teal-900/25"
                          : "border-[#2f4554]/25 bg-[#c6d9e4]/76 hover:border-teal-800/42",
                      ].join(" ")}
                    >
                      <span className="text-[14px] font-semibold text-[#101820]">
                        {p.title}
                      </span>
                      <span className="mt-1 text-[11px] font-semibold text-[#394b56]">
                        {p.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#354652]">
                  Деталі (необов&apos;язково)
                </span>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  placeholder="Побажання щодо зони, часу заїзду…"
                  className="w-full resize-none rounded-xl border border-[#2a3f4d]/28 bg-[#c9d8e1]/95 px-4 py-3 text-[14px] font-semibold text-[#121a21] outline-none transition placeholder:font-semibold placeholder:text-[#5c6f7a] focus:border-teal-700 focus:bg-[#d2e4ed] focus:ring-2 focus:ring-teal-900/20"
                />
              </label>

              <button
                type="submit"
                className="mt-2 rounded-xl border border-[#0f5f59] bg-[#127a71] py-3.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ecf8f7] shadow-[0_8px_24px_-8px_rgba(6,30,28,0.55)] transition hover:border-[#0a4f48] hover:bg-[#0f6d64]"
              >
                Надіслати запит
              </button>

              <p className="text-center text-[10px] font-semibold leading-relaxed text-[#465a63]">
                Після відправлення оберіть місця на карті — збереження місць окремим
                кроком з&apos;явиться разом із бекендом.
              </p>
            </>
          )}
        </form>
    </motion.aside>
  );
}
