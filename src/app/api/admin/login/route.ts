import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminPasswordConfigured,
  expectedAdminSessionToken,
} from "@/lib/admin/admin-session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!adminPasswordConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD не задано в .env.local" },
      { status: 503 },
    );
  }

  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Некоректний JSON" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password !== process.env.ADMIN_PASSWORD?.trim()) {
    return NextResponse.json({ error: "Невірний пароль" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, expectedAdminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
