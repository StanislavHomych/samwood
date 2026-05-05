"use client";

import { useEffect, useRef, useState } from "react";

function unionPeers(peers: Map<string, Set<string>>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const set of peers.values()) {
    for (const id of set) out[id] = true;
  }
  return out;
}

const DRAFT_PING_MS =
  Number(process.env.NEXT_PUBLIC_SEAT_DRAFT_PING_MS) || 5_000;
const PEER_STALE_MS =
  Number(process.env.NEXT_PUBLIC_SEAT_PEER_STALE_MS) || 20_000;

/**
 * Підключення до seat-sync-сервера: чернетки інших клієнтів + подія bookedPatch після збереження заявки.
 * Чернетку на сервері слід оновлювати після `hello` (інакше draft приходить до join — ігнорується).
 * Якщо `NEXT_PUBLIC_SEAT_SYNC_WS` не задано — повертає порожній remoteDraft без мережі.
 */
export function useSeatPresence(opts: {
  visitDateKey: string | null;
  selectedSeatIds: string[];
  onBookedPatch: (seatIds: string[]) => void;
  /** Сервер скинув чернетку після таймауту (наприклад 5 хв без оновлення). */
  onDraftHoldExpired?: () => void;
}) {
  const [remoteDraftSeatIds, setRemoteDraftSeatIds] = useState<
    Record<string, boolean>
  >({});
  /** Отримано `hello` від seat-sync — з’єднання справді працює. */
  const [livePresence, setLivePresence] = useState(false);
  const peersRef = useRef(new Map<string, Set<string>>());
  const peerSeenAtRef = useRef(new Map<string, number>());
  const wsRef = useRef<WebSocket | null>(null);
  const patchRef = useRef(opts.onBookedPatch);
  const expiredRef = useRef(opts.onDraftHoldExpired);
  const selectedRef = useRef(opts.selectedSeatIds);
  const helloReceivedRef = useRef(false);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const staleSweepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  useEffect(() => {
    patchRef.current = opts.onBookedPatch;
    expiredRef.current = opts.onDraftHoldExpired;
    selectedRef.current = opts.selectedSeatIds;
  }, [opts.onBookedPatch, opts.onDraftHoldExpired, opts.selectedSeatIds]);

  const url = process.env.NEXT_PUBLIC_SEAT_SYNC_WS?.trim();

  function clearPing() {
    if (pingIntervalRef.current != null) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }

  function clearStaleSweep() {
    if (staleSweepIntervalRef.current != null) {
      clearInterval(staleSweepIntervalRef.current);
      staleSweepIntervalRef.current = null;
    }
  }

  useEffect(() => {
    if (!url || !opts.visitDateKey) {
      helloReceivedRef.current = false;
      clearPing();
      clearStaleSweep();
      peersRef.current.clear();
      peerSeenAtRef.current.clear();
      const resetId = window.setTimeout(() => {
        setRemoteDraftSeatIds({});
        setLivePresence(false);
      }, 0);
      return () => window.clearTimeout(resetId);
    }

    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const applyPeersToState = () => {
      setRemoteDraftSeatIds(unionPeers(peersRef.current));
    };

    const flushDraft = (ws: WebSocket) => {
      if (ws.readyState !== WebSocket.OPEN || !helloReceivedRef.current) return;
      ws.send(
        JSON.stringify({ type: "draft", seatIds: selectedRef.current }),
      );
    };

    const connect = () => {
      if (closed) return;
      helloReceivedRef.current = false;
      setLivePresence(false);
      clearPing();
      clearStaleSweep();

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "join",
            visitDateKey: opts.visitDateKey,
          }),
        );
      };

      ws.onmessage = (ev) => {
        let msg: unknown;
        try {
          msg = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if (!msg || typeof msg !== "object") return;
        const m = msg as Record<string, unknown>;

        if (m.type === "hello") {
          peersRef.current.clear();
          peerSeenAtRef.current.clear();
          const peers = m.peers;
          const now = Date.now();
          if (peers && typeof peers === "object" && peers !== null) {
            for (const [cid, arr] of Object.entries(peers)) {
              if (!Array.isArray(arr)) continue;
              peersRef.current.set(
                cid,
                new Set(arr.filter((x): x is string => typeof x === "string")),
              );
              peerSeenAtRef.current.set(cid, now);
            }
          }
          applyPeersToState();
          helloReceivedRef.current = true;
          setLivePresence(true);
          flushDraft(ws);

          clearPing();
          pingIntervalRef.current = setInterval(() => {
            flushDraft(ws);
          }, DRAFT_PING_MS);
          staleSweepIntervalRef.current = setInterval(() => {
            const nowTs = Date.now();
            let changed = false;
            for (const [cid, seenAt] of peerSeenAtRef.current.entries()) {
              if (nowTs - seenAt <= PEER_STALE_MS) continue;
              peerSeenAtRef.current.delete(cid);
              peersRef.current.delete(cid);
              changed = true;
            }
            if (changed) applyPeersToState();
          }, 2_000);
          return;
        }

        if (
          m.type === "peerDraft" &&
          typeof m.clientId === "string" &&
          Array.isArray(m.seatIds)
        ) {
          peerSeenAtRef.current.set(m.clientId, Date.now());
          peersRef.current.set(
            m.clientId,
            new Set(m.seatIds.filter((x): x is string => typeof x === "string")),
          );
          applyPeersToState();
          return;
        }

        if (m.type === "peerLeft" && typeof m.clientId === "string") {
          peerSeenAtRef.current.delete(m.clientId);
          peersRef.current.delete(m.clientId);
          applyPeersToState();
          return;
        }

        if (m.type === "bookedPatch" && Array.isArray(m.seatIds)) {
          patchRef.current(
            m.seatIds.filter((x): x is string => typeof x === "string"),
          );
          return;
        }

        if (m.type === "draftExpired") {
          expiredRef.current?.();
          return;
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        helloReceivedRef.current = false;
        setLivePresence(false);
        clearPing();
        clearStaleSweep();
        if (closed) return;
        reconnectTimer = setTimeout(connect, 2500);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };
    };

    connect();

    return () => {
      closed = true;
      helloReceivedRef.current = false;
      setLivePresence(false);
      clearPing();
      clearStaleSweep();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
      peersRef.current.clear();
      peerSeenAtRef.current.clear();
      setRemoteDraftSeatIds({});
    };
  }, [url, opts.visitDateKey]);

  const selectionSig = opts.selectedSeatIds.join("\0");

  useEffect(() => {
    if (!opts.visitDateKey) return;
    const t = window.setTimeout(() => {
      if (!helloReceivedRef.current) return;
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({ type: "draft", seatIds: selectedRef.current }),
      );
    }, 220);

    return () => window.clearTimeout(t);
  }, [opts.visitDateKey, selectionSig]);

  return { remoteDraftSeatIds, livePresence };
}
