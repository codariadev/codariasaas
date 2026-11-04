import { deleteApp, getApps } from "firebase-admin/app";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { NextResponse } from "next/server";
import { masterAuth, masterDb, tenantApp } from "@/lib/server/admin";
import { adminGuard } from "@/lib/server/admin-auth";
import { cleanWeb, isBlocked, parseSa, probe, storedSa } from "@/lib/server/probe";
import { encrypt } from "@/lib/server/secrets";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const j = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });
const SEGS = ["barbearia", "salao", "estetica"], PLANS = ["essencial", "profissional", "premium"];
// Encerra as sessões de todos os usuários da empresa (suspensão): master + projeto do cliente.
async function revokeAll(id: string, projectId?: string) {
  const s = await masterDb().collection("members").where("tenantId", "==", id).limit(500).get();
  let ca: ReturnType<typeof getAuth> | null = null; try { ca = projectId ? getAuth(await tenantApp(id, projectId)) : null; } catch {}
  await Promise.all(s.docs.map(async (d) => { await masterAuth().revokeRefreshTokens(d.id).catch(() => {}); await ca?.revokeRefreshTokens(d.id).catch(() => {}); }));
}
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await adminGuard(req); if (!("a" in g)) return g.r;
  const id = params.id, b = await req.json().catch(() => ({})), db = masterDb(), tRef = db.doc(`tenants/${id}`), t = (await tRef.get()).data();
  if (!t) return j({ error: "nao_encontrada" }, 404);
  const cfg = (await db.doc(`tenant_configs/${id}`).get()).data(), web = cleanWeb(cfg?.firebase), log = (action: string) => db.collection("audit_logs").add({ tenantId: id, actorUid: g.a.uid, action, timestamp: FieldValue.serverTimestamp() });
  switch (b.action) {
    case "status": {
      if (!["active", "suspended"].includes(b.status)) return j({ error: "dados_invalidos" }, 400);
      await tRef.update({ status: b.status }); if (b.status === "suspended") await revokeAll(id, web?.projectId);
      await log("tenant_" + b.status); return j({ ok: true });
    }
    case "update": {
      const up: Record<string, unknown> = {};
      if (typeof b.name === "string" && b.name.trim()) up.businessName = b.name.trim();
      if (SEGS.includes(b.segment)) up.segment = b.segment; if (PLANS.includes(b.plan)) up.plan = b.plan;
      if (!Object.keys(up).length) return j({ error: "dados_invalidos" }, 400);
      await tRef.update(up); await log("tenant_update"); return j({ ok: true });
    }
    case "owner_link": {
      const o = (await db.collection("members").where("tenantId", "==", id).where("role", "==", "owner").limit(1).get()).docs[0]?.data();
      if (!o?.email) return j({ error: "sem_dono" }, 404);
      await log("owner_link"); return j({ ok: true, email: o.email, resetLink: await masterAuth().generatePasswordResetLink(o.email) });
    }
    case "test": {
      if (!web) return j({ error: "config_web_invalida" }, 400);
      const checks = await probe(web, await storedSa(id).catch(() => null)); return j({ ok: !isBlocked(checks, false), checks });
    }
    case "rotate_key": {
      const sa = parseSa(b.sa); if (!web || !sa) return j({ error: "chave_invalida" }, 400);
      const checks = await probe(web, sa); if (isBlocked(checks, true)) return j({ error: "verificacao_falhou", checks }, 422);
      await db.doc(`tenant_secrets/${id}`).set({ enc: encrypt(JSON.stringify(sa)), updatedAt: FieldValue.serverTimestamp() });
      const old = getApps().find((a) => a.name === "t:" + id); if (old) await deleteApp(old).catch(() => {});
      await log("key_rotate"); return j({ ok: true, checks });
    }
    default: return j({ error: "acao_invalida" }, 400);
  }
}
