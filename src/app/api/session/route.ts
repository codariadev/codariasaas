import { getAuth } from "firebase-admin/auth";
import { NextResponse } from "next/server";
import { clientIp, limited } from "@/lib/rate-limit";
import { caller, masterDb, tenantApp } from "@/lib/server/admin";
import { adminGuard } from "@/lib/server/admin-auth";
import type { PlanId, PublicTenantConfig, SegmentIdT } from "@/types";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const SEGS: SegmentIdT[] = ["barbearia", "salao", "estetica"], PLANS: PlanId[] = ["essencial", "profissional", "premium"];
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
// Após o login no Firebase MASTER: descobre a empresa do usuário e emite um token de sessão para o Firebase DO CLIENTE (com papel nos claims).
export async function POST(req: Request) {
  if (limited("session:" + clientIp(req), 40)) return fail("rate_limited", 429);
  if ("a" in (await adminGuard(req))) return NextResponse.json({ admin: true }, { headers: { "Cache-Control": "no-store" } }); // administrador da CodariaDev: sem empresa, vai ao /admin
  const me = await caller(req); if (!me) return fail("no_access", 403);
  try {
    const { uid, mem } = me, db = masterDb();
    const [t, c] = await Promise.all([db.doc(`tenants/${mem.tenantId}`).get(), db.doc(`tenant_configs/${mem.tenantId}`).get()]), td = t.data(), cd = c.data() ?? {};
    if (!td) return fail("no_access", 403);
    if (td.status !== "active") return fail("tenant_suspended", 403);
    const fb = cd.firebase; if (!fb?.apiKey || !fb?.projectId) return fail("server", 500);
    const tenant: PublicTenantConfig = { tenantId: mem.tenantId, slug: mem.tenantId, name: String(td.businessName ?? "Estabelecimento"), segment: SEGS.includes(td.segment) ? td.segment : "barbearia", plan: PLANS.includes(td.plan) ? td.plan : "essencial", accent: typeof cd.theme?.accent === "string" ? cd.theme.accent : "#7c4dff", status: "active", mode: "firebase", firebase: fb };
    const customToken = await getAuth(await tenantApp(mem.tenantId, fb.projectId)).createCustomToken(uid, { role: mem.role, ...(mem.professionalId ? { pid: String(mem.professionalId) } : {}) });
    return NextResponse.json({ user: { uid, name: mem.name, email: mem.email, role: mem.role, professionalId: mem.professionalId }, tenant, customToken }, { headers: { "Cache-Control": "no-store" } });
  } catch { return fail("server", 500); }
}
