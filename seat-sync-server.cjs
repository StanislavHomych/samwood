"use strict";

try {
  const path = require("path");
  const dotenv = require("dotenv");
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
} catch {
  /* dotenv може бути відсутній у production без devDependencies — тоді лише змінні shell */
}

/**
 * Окремий процес: WebSocket для «чернеток» вибору місць + HTTP для push після збереження заявки.
 * Запуск: `npm run seat-sync` (паралельно з `npm run dev`).
 *
 * Змінні: SEAT_SYNC_PORT (3331), SEAT_SYNC_SECRET (обов’язково для /internal/booked).
 * SEAT_DRAFT_TTL_MS — скільки тримати «чернетку» без оновлення (за замовч. 5 хв).
 */

const http = require("http");
const { WebSocketServer } = require("ws");
const { randomUUID } = require("crypto");

const PORT = Number(process.env.SEAT_SYNC_PORT || 3331);
const SECRET = (process.env.SEAT_SYNC_SECRET || "").trim();
const DRAFT_TTL_MS = Number(process.env.SEAT_DRAFT_TTL_MS) || 5 * 60 * 1000;

/** Кімната → підключені клієнти */
const roomMembers = new Map();
/** Метадані сокета */
const meta = new WeakMap();
/** Усі активні сокети (для TTL чернеток) */
const allSockets = new Set();

function ensureRoom(roomKey) {
  if (!roomMembers.has(roomKey)) roomMembers.set(roomKey, new Set());
  return roomMembers.get(roomKey);
}

function leaveRoom(ws) {
  const m = meta.get(ws);
  if (!m) return;
  const { roomKey, clientId } = m;
  const set = roomMembers.get(roomKey);
  if (set) {
    set.delete(ws);
    if (set.size === 0) roomMembers.delete(roomKey);
  }
  meta.delete(ws);
  const msg = JSON.stringify({ type: "peerLeft", clientId });
  const peers = roomMembers.get(roomKey);
  if (!peers) return;
  for (const peer of peers) {
    if (peer.readyState === 1) peer.send(msg);
  }
}

function broadcast(roomKey, obj, exceptWs) {
  const msg = JSON.stringify(obj);
  const peers = roomMembers.get(roomKey);
  if (!peers) return;
  for (const peer of peers) {
    if (peer !== exceptWs && peer.readyState === 1) peer.send(msg);
  }
}

function handleMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return;
  }
  if (!msg || typeof msg.type !== "string") return;

  if (msg.type === "join") {
    const visitDateKey =
      typeof msg.visitDateKey === "string" ? msg.visitDateKey.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDateKey)) {
      ws.send(
        JSON.stringify({ type: "error", message: "Invalid visitDateKey" }),
      );
      return;
    }
    leaveRoom(ws);
    const roomKey = `visit:${visitDateKey}`;
    const clientId = randomUUID();
    const seats = new Set();
    meta.set(ws, {
      roomKey,
      clientId,
      seats,
      lastDraftAt: Date.now(),
    });
    ensureRoom(roomKey).add(ws);

    /** @type {Record<string, string[]>} */
    const peers = {};
    const memberSet = roomMembers.get(roomKey);
    if (memberSet) {
      for (const other of memberSet) {
        if (other === ws) continue;
        const om = meta.get(other);
        if (om?.seats?.size) peers[om.clientId] = [...om.seats];
      }
    }
    ws.send(JSON.stringify({ type: "hello", clientId, peers }));
    return;
  }

  if (msg.type === "draft") {
    const m = meta.get(ws);
    if (!m) return;
    const seatIds = Array.isArray(msg.seatIds)
      ? msg.seatIds.filter((x) => typeof x === "string")
      : [];
    m.lastDraftAt = Date.now();
    m.seats = new Set(seatIds);
    broadcast(
      m.roomKey,
      { type: "peerDraft", clientId: m.clientId, seatIds: [...m.seats] },
      ws,
    );
  }
}

function sweepDraftTtl() {
  const now = Date.now();
  for (const ws of allSockets) {
    const m = meta.get(ws);
    if (!m || now - m.lastDraftAt <= DRAFT_TTL_MS) continue;
    if (m.seats.size === 0) {
      m.lastDraftAt = now;
      continue;
    }
    m.seats = new Set();
    m.lastDraftAt = now;
    broadcast(
      m.roomKey,
      { type: "peerDraft", clientId: m.clientId, seatIds: [] },
      ws,
    );
    try {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "draftExpired" }));
      }
    } catch {
      /* ignore */
    }
  }
}

setInterval(sweepDraftTtl, 10_000);

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/internal/booked") {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!SECRET || token !== SECRET) {
      res.writeHead(401).end("Unauthorized");
      return;
    }
    let body = "";
    for await (const chunk of req) body += chunk;
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      res.writeHead(400).end("Invalid JSON");
      return;
    }
    const visitDateKey =
      typeof data.visitDateKey === "string" ? data.visitDateKey.trim() : "";
    const seatIds = Array.isArray(data.seatIds) ? data.seatIds : [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDateKey)) {
      res.writeHead(400).end("Bad visitDateKey");
      return;
    }
    const roomKey = `visit:${visitDateKey}`;
    const patch = {
      type: "bookedPatch",
      seatIds: seatIds.filter((x) => typeof x === "string"),
    };
    const msg = JSON.stringify(patch);
    const peers = roomMembers.get(roomKey);
    if (peers) {
      for (const peer of peers) {
        if (peer.readyState === 1) peer.send(msg);
      }
    }
    res.writeHead(204).end();
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  allSockets.add(ws);
  ws.on("message", (raw) => handleMessage(ws, raw));
  ws.on("close", () => {
    allSockets.delete(ws);
    leaveRoom(ws);
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console -- CLI entry
  console.log(`[seat-sync] http+ws :${PORT} (POST /internal/booked)`);
});
