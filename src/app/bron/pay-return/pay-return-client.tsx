"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { formatSeatLineUk } from "@/lib/pool/seat-pricing";

const PAYMENT_RECEIPT_STORAGE_KEY = "rivera_payment_receipt_v1";

type PaymentReceipt = {
  createdAtIso: string;
  visitDateKey: string;
  seatIds: string[];
  fullName: string;
  phone: string;
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
      fullName,
      phone,
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

function formatDateTimeUk(iso: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatMoneyKop(kop: number): string {
  return (kop / 100).toLocaleString("uk-UA", {
    style: "currency",
    currency: "UAH",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatVisitDateKeyUk(visitDateKey: string): string {
  const d = new Date(`${visitDateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return visitDateKey;
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
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

  useEffect(() => {
    if (!receipt) return;
    void fetch("/api/booking/monobank-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(receipt),
    }).catch(() => {
      // Ignore transient network issues; receipt is still visible to the user.
    });
  }, [receipt]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center font-[family-name:var(--font-montserrat)]">
      <h1 className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-[#152025]">
        Дякуємо!
      </h1>

      {receipt ? (
        <div className="mt-8 w-full max-w-[360px] rounded-2xl border border-slate-300 bg-white p-5 text-left shadow-sm">
          <p className="font-mono text-[12px] font-bold tracking-wide text-slate-900">
            RIVERA POOL
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-700">
            ==============================
          </p>
          <p className="font-mono text-[11px] font-semibold text-slate-800">ЧЕК</p>
          <div className="mt-2 space-y-1 font-mono text-[11px] text-slate-700">
            <p>Дата/час: {formatDateTimeUk(receipt.createdAtIso)}</p>
            <p>Візит: {formatVisitDateKeyUk(receipt.visitDateKey)}</p>
            <p>Клієнт: {receipt.fullName || "-"}</p>
            <p>Телефон: {receipt.phone}</p>
            <p>Оплата: MONOBANK</p>
            <p>Invoice: {receipt.invoiceId ?? "-"}</p>
          </div>
          <p className="mt-3 font-mono text-[11px] text-slate-700">
            ------------------------------
          </p>
          <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
            <p className="font-mono text-[11px] font-semibold text-slate-800">
              ПОЗИЦІЇ:
            </p>
            <ul className="mt-2 space-y-1 font-mono text-[11px] text-slate-800">
              {receipt.seatIds.map((id) => (
                <li key={id}>- {formatSeatLineUk(id)}</li>
              ))}
            </ul>
          </div>
          <p className="mt-3 font-mono text-[11px] text-slate-700">
            ------------------------------
          </p>
          <p className="font-mono text-[13px] font-bold text-slate-900">
            РАЗОМ: {formatMoneyKop(receipt.amountKopiyky)}
          </p>
          <p className="font-mono text-[11px] text-slate-700">
            ==============================
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-600">
            Дякуємо за бронювання!
          </p>
        </div>
      ) : null}

      <Link
        href="/"
        className="mt-8 rounded-xl border border-teal-800/40 bg-[#c5d9e2] px-5 py-3 text-sm font-semibold text-teal-950 transition hover:bg-[#b9d4df]"
      >
        На головну
      </Link>
    </div>
  );
}
