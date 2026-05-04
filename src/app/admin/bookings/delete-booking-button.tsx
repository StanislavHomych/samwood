"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
import { deleteBookingRequest } from "./actions";

type Props = {
  bookingId: string;
};

export function DeleteBookingButton({ bookingId }: Props) {
  const router = useRouter();
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descId = `${dialogId}-desc`;
  const panelRef = useRef<HTMLDivElement>(null);
  const openBtnRef = useRef<HTMLButtonElement>(null);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLButtonElement>(
        "button[data-modal-cancel]",
      )?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open, pending]);

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
    window.setTimeout(() => openBtnRef.current?.focus(), 0);
  }

  async function confirmDelete() {
    setError(null);
    setPending(true);
    try {
      const res = await deleteBookingRequest(bookingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const modal =
    open && mounted ? (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        role="presentation"
      >
        <button
          type="button"
          className="absolute inset-0 bg-zinc-900/55 backdrop-blur-[3px]"
          aria-label="Закрити діалог"
          disabled={pending}
          onClick={close}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.35)] ring-1 ring-zinc-900/5"
        >
          <h2
            id={titleId}
            className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-zinc-900"
          >
            Видалити заявку?
          </h2>
          <p
            id={descId}
            className="mt-3 text-sm font-medium leading-relaxed text-zinc-600"
          >
            Дію не скасувати. Місця знову стануть вільними на карті після
            оновлення сторінки бронювання.
          </p>
          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              data-modal-cancel
              disabled={pending}
              onClick={close}
              className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              Скасувати
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void confirmDelete()}
              className="h-10 rounded-lg border border-red-700 bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
            >
              {pending ? "Видалення…" : "Видалити заявку"}
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        ref={openBtnRef}
        type="button"
        disabled={pending && !open}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="rounded-lg border border-red-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-800 transition hover:bg-red-50 disabled:opacity-50"
      >
        Видалити
      </button>
      {!open && error ? (
        <span className="max-w-[10rem] text-right text-[10px] font-medium text-red-700">
          {error}
        </span>
      ) : null}
      {mounted && modal ? createPortal(modal, document.body) : null}
    </div>
  );
}
