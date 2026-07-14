import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "pool_admin_sess";

/** Тривалість сесії адміна. */
export const ADMIN_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

/**
 * Порівняння двох рядків за сталий час (constant-time), незалежно від довжини.
 * Обидва хешуємо до sha256 — так `timingSafeEqual` завжди отримує буфери однакової
 * довжини й не «зливає» довжину секрета.
 */
function safeStringEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

/** Значення cookie залежить лише від ADMIN_PASSWORD (не зберігаємо пароль у відкритому вигляді). */
export function expectedAdminSessionToken(): string {
  const p = process.env.ADMIN_PASSWORD?.trim() ?? "";
  return createHash("sha256")
    .update(`pool_admin_v1:${p}`, "utf8")
    .digest("base64url");
}

/** Перевірка cookie сесії (constant-time). */
export function isAdminSessionValid(cookieValue: string | undefined): boolean {
  const pw = process.env.ADMIN_PASSWORD?.trim();
  if (!pw || !cookieValue) return false;
  return safeStringEqual(cookieValue, expectedAdminSessionToken());
}

/** Перевірка введеного пароля адміна (constant-time). */
export function verifyAdminPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD?.trim();
  if (!pw) return false;
  return safeStringEqual(input, pw);
}

export function adminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}
