import { createHash } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "pool_admin_sess";

/** Значення cookie залежить лише від ADMIN_PASSWORD (не зберігаємо пароль у відкритому вигляді). */
export function expectedAdminSessionToken(): string {
  const p = process.env.ADMIN_PASSWORD?.trim() ?? "";
  return createHash("sha256")
    .update(`pool_admin_v1:${p}`, "utf8")
    .digest("base64url");
}

export function isAdminSessionValid(cookieValue: string | undefined): boolean {
  const pw = process.env.ADMIN_PASSWORD?.trim();
  if (!pw || !cookieValue) return false;
  return cookieValue === expectedAdminSessionToken();
}

export function adminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}
