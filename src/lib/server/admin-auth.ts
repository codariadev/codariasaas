import { NextResponse } from "next/server";
import { clientIp, limited } from "@/lib/rate-limit";
import { masterAuth, masterDb } from "@/lib/server/admin";
// Painel interno da CodariaDev: só entra quem tem admins/{uid} {active:true} no Firebase master (criado por scripts/create-admin.mjs).
export async function adminGuard(req: Request): Promise<{ a: { uid: string; email?: string } } | { r: Response }> {
  const res = (error: string, status: number) => ({ r: NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } }) });
  if (limited("admin:" + clientIp(req), 120)) return res("rate_limited", 429);
  const h = req.headers.get("authorization") ?? "", token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res("unauthorized", 401);
  try {
    const d = await masterAuth().verifyIdToken(token, true), a = (await masterDb().doc(`admins/${d.uid}`).get()).data();
    return a?.active === true ? { a: { uid: d.uid, email: d.email } } : res("forbidden", 403);
  } catch { return res("unauthorized", 401); }
}
