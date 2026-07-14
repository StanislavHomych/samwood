"use client";

import { useEffect, useRef, useState } from "react";

/** Інтервал опитування стану карти (booked + чужі утримання), мс. */
const POLL_MS = Number(process.env.NEXT_PUBLIC_SEAT_POLL_MS) || 4_000;
/** Скільки тримати власну «чернетку» без активності, поки не скинути її, мс. */
const DRAFT_TTL_MS =
  Number(process.env.NEXT_PUBLIC_SEAT_DRAFT_TTL_MS) || 5 * 60 * 1000;

/** Стабільний id вкладки для утримання місць (draft hold). */
function makeClientId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `c-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

/**
 * Полінг-синхронізація карти місць (заміна WebSocket-серверу — працює на Vercel + Neon).
 *
 * Кожні `POLL_MS`:
 *  1) heartbeat-ом утримує обрані місця (POST /api/booking/seat-hold);
 *  2) опитує стан (GET /api/booking/seat-state): підтверджені броні + чужі утримання.
 *
 * Повертає той самий контракт, що й раніше:
 *  - `remoteDraftSeatIds` — місця, які зараз обирають інші;
 *  - `livePresence` — чи відповідає сервер (останній цикл успішний).
 * При закритті/зміні дати best-effort звільняє свої утримання.
 */
export function useSeatPresence(opts: {
  visitDateKey: string | null;
  selectedSeatIds: string[];
  onBookedPatch: (seatIds: string[]) => void;
  /** Власну чернетку скинуто після таймауту бездіяльності (за замовч. 5 хв). */
  onDraftHoldExpired?: () => void;
}) {
  const [remoteDraftSeatIds, setRemoteDraftSeatIds] = useState<
    Record<string, boolean>
  >({});
  const [livePresence, setLivePresence] = useState(false);

  const [clientId] = useState<string>(makeClientId);

  const patchRef = useRef(opts.onBookedPatch);
  const expiredRef = useRef(opts.onDraftHoldExpired);
  const selectedRef = useRef(opts.selectedSeatIds);
  const lastInteractionRef = useRef(0);
  /** Сигнатури останнього стану — щоб не оновлювати React-стан без змін. */
  const heldSigRef = useRef("");
  const bookedSigRef = useRef("");

  useEffect(() => {
    patchRef.current = opts.onBookedPatch;
    expiredRef.current = opts.onDraftHoldExpired;
  }, [opts.onBookedPatch, opts.onDraftHoldExpired]);

  const visitDateKey = opts.visitDateKey;

  // Цикл опитування + heartbeat для активного дня візиту.
  useEffect(() => {
    if (!visitDateKey) {
      const id = window.setTimeout(() => {
        setRemoteDraftSeatIds({});
        setLivePresence(false);
      }, 0);
      return () => window.clearTimeout(id);
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    heldSigRef.current = "";
    bookedSigRef.current = "";

    const tick = async () => {
      // Власна чернетка «протухла» через бездіяльність — скидаємо і не утримуємо.
      if (
        selectedRef.current.length > 0 &&
        lastInteractionRef.current > 0 &&
        Date.now() - lastInteractionRef.current > DRAFT_TTL_MS
      ) {
        expiredRef.current?.();
      }

      try {
        await fetch("/api/booking/seat-hold", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: visitDateKey,
            clientId,
            seatIds: selectedRef.current,
          }),
        });
      } catch {
        /* наступний цикл повторить */
      }
      if (cancelled) return;

      try {
        const res = await fetch(
          `/api/booking/seat-state?date=${encodeURIComponent(visitDateKey)}&clientId=${encodeURIComponent(clientId)}`,
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as {
          bookedSeatIds?: string[];
          heldSeatIds?: string[];
        };
        if (cancelled) return;
        setLivePresence(true);

        const heldIds = (data.heldSeatIds ?? []).filter(
          (x): x is string => typeof x === "string",
        );
        const heldSig = heldIds.join(",");
        if (heldSig !== heldSigRef.current) {
          heldSigRef.current = heldSig;
          const held: Record<string, boolean> = {};
          for (const id of heldIds) held[id] = true;
          setRemoteDraftSeatIds(held);
        }

        const bookedIds = (data.bookedSeatIds ?? []).filter(
          (x): x is string => typeof x === "string",
        );
        const bookedSig = bookedIds.join(",");
        if (bookedIds.length > 0 && bookedSig !== bookedSigRef.current) {
          bookedSigRef.current = bookedSig;
          patchRef.current(bookedIds);
        }
      } catch {
        if (!cancelled) setLivePresence(false);
      } finally {
        if (!cancelled) timer = setTimeout(tick, POLL_MS);
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      // Best-effort: звільнити свої утримання навіть під час вивантаження сторінки.
      try {
        const body = JSON.stringify({ date: visitDateKey, clientId });
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          navigator.sendBeacon(
            "/api/booking/seat-hold/release",
            new Blob([body], { type: "application/json" }),
          );
        } else {
          void fetch("/api/booking/seat-hold/release", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        /* ignore */
      }
      setRemoteDraftSeatIds({});
      setLivePresence(false);
    };
  }, [visitDateKey, clientId]);

  // Швидке утримання при зміні вибору (не чекаючи наступного циклу).
  const selectionSig = opts.selectedSeatIds.join("\0");
  useEffect(() => {
    selectedRef.current = opts.selectedSeatIds;
    lastInteractionRef.current = Date.now();
    if (!visitDateKey) return;
    const t = window.setTimeout(() => {
      void fetch("/api/booking/seat-hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: visitDateKey,
          clientId,
          seatIds: selectedRef.current,
        }),
      }).catch(() => {});
    }, 220);
    return () => window.clearTimeout(t);
  }, [selectionSig, visitDateKey, clientId, opts.selectedSeatIds]);

  return { remoteDraftSeatIds, livePresence, clientId };
}
