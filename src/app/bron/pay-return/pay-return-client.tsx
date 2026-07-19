"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";

type FiscalCheck = {
  id: string;
  type: "sale" | "return";
  status: "new" | "process" | "done" | "failed";
  statusDescription?: string;
  taxUrl?: string;
  file?: string;
  fiscalizationSource?: string;
};

function parseFiscalCheck(value: unknown): FiscalCheck | null {
  if (typeof value !== "object" || value === null) return null;
  const c = value as Record<string, unknown>;
  if (typeof c.id !== "string") return null;
  return {
    id: c.id,
    type: c.type === "return" ? "return" : "sale",
    status: (["new", "process", "done", "failed"] as const).includes(
      c.status as FiscalCheck["status"],
    )
      ? (c.status as FiscalCheck["status"])
      : "new",
    statusDescription:
      typeof c.statusDescription === "string" ? c.statusDescription : undefined,
    taxUrl: typeof c.taxUrl === "string" && c.taxUrl ? c.taxUrl : undefined,
    file: typeof c.file === "string" && c.file ? c.file : undefined,
    fiscalizationSource:
      typeof c.fiscalizationSource === "string" ? c.fiscalizationSource : undefined,
  };
}

const PAYMENT_RECEIPT_STORAGE_KEY = "rivera_payment_receipt_v1";

type PaymentReceipt = {
  createdAtIso: string;
  visitDateKey: string;
  seatIds: string[];
  /** Місця з дитячим тарифом (спец-дні). */
  childSeatIds?: string[];
  fullName: string;
  phone: string;
  email?: string;
  details?: string;
  paymentMethod: "monobank";
  amountKopiyky: number;
  invoiceId?: string | null;
};

let cachedRawReceipt: string | null | undefined;
let cachedParsedReceipt: PaymentReceipt | null = null;

function parseReceipt(raw: string): PaymentReceipt | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const seatIds = Array.isArray((parsed as { seatIds?: unknown }).seatIds)
      ? (parsed as { seatIds: unknown[] }).seatIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [];
    const childSeatIds = Array.isArray(
      (parsed as { childSeatIds?: unknown }).childSeatIds,
    )
      ? (parsed as { childSeatIds: unknown[] }).childSeatIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [];

    const createdAtIso =
      typeof (parsed as { createdAtIso?: unknown }).createdAtIso === "string"
        ? (parsed as { createdAtIso: string }).createdAtIso
        : "";
    const visitDateKey =
      typeof (parsed as { visitDateKey?: unknown }).visitDateKey === "string"
        ? (parsed as { visitDateKey: string }).visitDateKey
        : "";
    const fullName =
      typeof (parsed as { fullName?: unknown }).fullName === "string"
        ? (parsed as { fullName: string }).fullName
        : "";
    const phone =
      typeof (parsed as { phone?: unknown }).phone === "string"
        ? (parsed as { phone: string }).phone
        : "";
    const email =
      typeof (parsed as { email?: unknown }).email === "string"
        ? (parsed as { email: string }).email
        : "";
    const details =
      typeof (parsed as { details?: unknown }).details === "string"
        ? (parsed as { details: string }).details
        : "";
    const amountKopiyky =
      typeof (parsed as { amountKopiyky?: unknown }).amountKopiyky === "number"
        ? (parsed as { amountKopiyky: number }).amountKopiyky
        : 0;
    const invoiceId =
      typeof (parsed as { invoiceId?: unknown }).invoiceId === "string"
        ? (parsed as { invoiceId: string }).invoiceId
        : null;

    if (!createdAtIso || !visitDateKey || seatIds.length === 0 || !phone) {
      return null;
    }

    return {
      createdAtIso,
      visitDateKey,
      seatIds,
      childSeatIds,
      fullName,
      phone,
      email,
      details,
      paymentMethod: "monobank",
      amountKopiyky,
      invoiceId,
    };
  } catch {
    return null;
  }
}

function readReceiptSnapshot(): PaymentReceipt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PAYMENT_RECEIPT_STORAGE_KEY);
    if (raw === cachedRawReceipt) return cachedParsedReceipt;
    cachedRawReceipt = raw;
    cachedParsedReceipt = raw ? parseReceipt(raw) : null;
    return cachedParsedReceipt;
  } catch {
    return null;
  }
}

function subscribeReceipt(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  const id = window.setTimeout(onStoreChange, 0);
  return () => {
    window.clearTimeout(id);
    window.removeEventListener("storage", handler);
  };
}

export function PayReturnClient() {
  const receipt = useSyncExternalStore(
    subscribeReceipt,
    readReceiptSnapshot,
    () => null,
  );

  const [fiscalCheck, setFiscalCheck] = useState<FiscalCheck | null>(null);
  /** true, коли опитування завершилось (чек готовий/фейл або спроби вичерпано). */
  const [fiscalSettled, setFiscalSettled] = useState(false);

  useEffect(() => {
    if (!receipt) return;

    let cancelled = false;
    setFiscalSettled(false);
    // Фіскалізація асинхронна: чек з'являється не миттєво. Опитуємо confirm
    // кілька разів, поки чек не стане `done`/`failed` (або не вичерпаємо спроби).
    // Якщо ПРРО вимкнено — fiscalCheck лишиться null; це нормально для зворотної сумісності.
    const DELAYS_MS = [0, 3000, 5000, 8000, 12000];

    const confirmOnce = async (): Promise<FiscalCheck | null> => {
      try {
        const res = await fetch("/api/booking/monobank-confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(receipt),
        });
        const data: unknown = await res.json().catch(() => null);
        const check = parseFiscalCheck(
          (data as { fiscalCheck?: unknown })?.fiscalCheck,
        );
        if (check && !cancelled) setFiscalCheck(check);
        return check;
      } catch {
        return null;
      }
    };

    void (async () => {
      for (const delay of DELAYS_MS) {
        if (cancelled) return;
        if (delay) await new Promise((r) => setTimeout(r, delay));
        if (cancelled) return;
        const check = await confirmOnce();
        if (check?.status === "done" || check?.status === "failed") {
          if (!cancelled) setFiscalSettled(true);
          return;
        }
      }
      if (!cancelled) setFiscalSettled(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [receipt]);

  const showFiscalPdf =
    fiscalCheck?.status === "done" && Boolean(fiscalCheck.file || fiscalCheck.taxUrl);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center font-[family-name:var(--font-montserrat)]">
      <h1 className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-[#152025]">
        Дякуємо!
      </h1>

      {receipt ? (
        <div className="mt-8 w-full max-w-[360px] rounded-2xl border border-slate-300 bg-white p-5 text-left shadow-sm">
          {showFiscalPdf ? (
            <div className="space-y-3">
              {fiscalCheck.file ? (
                <object
                  data={`data:application/pdf;base64,${fiscalCheck.file}`}
                  type="application/pdf"
                  className="h-[520px] w-full rounded-lg border border-slate-200"
                  aria-label="Фіскальний чек (PDF)"
                >
                  <p className="p-3 text-[13px] text-slate-600">
                    Не вдалося показати PDF.{" "}
                    {fiscalCheck.taxUrl ? (
                      <a
                        href={fiscalCheck.taxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-teal-800 underline"
                      >
                        Відкрити чек
                      </a>
                    ) : null}
                  </p>
                </object>
              ) : null}
            
            </div>
          ) : fiscalCheck?.status === "failed" ? (
            <p className="text-center text-[13px] text-slate-600">
              Оплату підтверджено. Фіскальний чек надішлемо додатково.
              {fiscalCheck.statusDescription
                ? ` (${fiscalCheck.statusDescription})`
                : ""}
            </p>
          ) : !fiscalSettled ? (
            <p className="flex items-center justify-center gap-2 text-[13px] text-slate-600">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
              Підтверджуємо оплату…
            </p>
          ) : (
            <p className="text-center text-[13px] text-slate-600">
              Оплату підтверджено. Дякуємо за бронювання!
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-slate-600">
          Оплату прийнято. Деталі бронювання надіслано на email (якщо вказано).
        </p>
      )}

      <Link
        href="/"
        className="mt-8 rounded-xl border border-teal-800/40 bg-[#c5d9e2] px-5 py-3 text-sm font-semibold text-teal-950 transition hover:bg-[#b9d4df]"
      >
        На головну
      </Link>
    </div>
  );
}
