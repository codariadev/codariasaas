import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/server/admin-auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const FILES: Record<string, string> = { firestore: "firestore.rules", storage: "storage.rules", indexes: "firestore.indexes.json" };
// Entrega as regras/índices versionados para o admin colar no console do projeto do cliente.
export async function GET(req: Request) {
  const g = await adminGuard(req); if (!("a" in g)) return g.r;
  const f = FILES[new URL(req.url).searchParams.get("file") ?? ""]; if (!f) return NextResponse.json({ error: "arquivo" }, { status: 400 });
  return new NextResponse(readFileSync(join(process.cwd(), "firebase", f), "utf8"), { headers: { "content-type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
