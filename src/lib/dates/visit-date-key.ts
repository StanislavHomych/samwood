/**
 * Робота з датою візиту.
 *
 * Ключова ідея: **день візиту — це календарний день, а не момент часу.**
 * Тому він завжди представлений як рядок `YYYY-MM-DD` (source of truth), а коли
 * потрібен `Date` (для колонки timestamptz та діапазонних запитів) — це
 * **опівніч UTC** цього дня. Так календарний день не «з’їжджає» залежно від
 * таймзони сервера (Vercel/Docker зазвичай працюють в UTC, а не в Europe/Kyiv).
 *
 * Реальні моменти часу (`createdAt`, `paidAt`) — це вже не календарний день, їх
 * форматуємо в бізнес-таймзоні через {@link formatInstant}.
 */

/** Бізнес-таймзона закладу (для показу реальних моментів часу в адмінці). */
export const BUSINESS_TIME_ZONE = "Europe/Kyiv";

const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Ключ дня з `Date`, який представляє **обраний користувачем календарний день**.
 * Читає локальні компоненти дати (клієнт: `Date` з календаря → рік/місяць/число,
 * які бачить користувач). Не використовуйте для повторного форматування збереженої
 * дати візиту — для показу є {@link formatVisitDayHuman}.
 */
export function formatVisitDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Парсинг ключа `YYYY-MM-DD` у канонічний `Date` — **опівніч UTC** цього дня.
 * Повертає `null` для некоректного або неіснуючого дня (напр. `2026-02-30`).
 */
export function parseVisitDateKey(key: string): Date | null {
  const m = KEY_RE.exec(key.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

/**
 * Наступний календарний день (UTC) — верхня межа для запитів `>= day AND < end`.
 * Рахується в UTC, тож стійке до переходів на літній/зимовий час.
 */
export function nextVisitDay(dayStartUtc: Date): Date {
  const end = new Date(dayStartUtc);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

/** Валідність ключа `YYYY-MM-DD` (існуючий календарний день). */
export function isValidVisitDateKey(key: string): boolean {
  return parseVisitDateKey(key) !== null;
}

/**
 * Показ збереженого дня візиту (опівніч UTC) як календарної дати.
 * Завжди в UTC, тож ніколи не зсувається на сусідній день.
 */
export function formatVisitDayHuman(d: Date, locale = "uk-UA"): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Показ реального моменту часу (`createdAt`, `paidAt`) у бізнес-таймзоні.
 */
export function formatInstant(d: Date, locale = "uk-UA"): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(d);
}

/**
 * Сьогоднішній календарний день у бізнес-таймзоні як ключ `YYYY-MM-DD`.
 * Не залежить від таймзони процесу.
 */
export function todayVisitDateKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
