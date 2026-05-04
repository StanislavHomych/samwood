import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ds = await getDataSource();
    await ds.query("SELECT 1");
    return NextResponse.json({ ok: true, database: "postgresql" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
