import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Monobank надсилає POST при зміні статусу рахунку (якщо задано MONOBANK_WEBHOOK_URL).
 * Тіло — як у GET invoice/status. Потрібна верифікація підпису (див. документацію monobank).
 */
export async function POST(req: Request) {
  await req.text().catch(() => "");
  // TODO: перевірити підпис, оновити статус броню в БД
  return NextResponse.json({ ok: true });
}
