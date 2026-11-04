import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { clientIp, limited } from "@/lib/rate-limit";
import { ROLES, RoleT, caller, masterAuth, masterDb, tenantApp } from "@/lib/server/admin";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const j = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });
const mail = (e: unknown): e is string => typeof e === "string" && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
// Gestão de usuários do PRÓPRIO tenant do chamador (owner/admin). O tenant vem do cadastro no master, nunca do corpo da requisição.
async function guard(req: Request) {
  if (limited("team:" + clientIp(req), 60)) return { r: j({ error: "rate_limited" }, 429) };
  const me = await caller(req); if (!me) return { r: j({ error: "unauthorized" }, 401) };
  if (!["owner", "admin"].includes(me.mem.role)) return { r: j({ error: "forbidden" }, 403) };
  return { me };
}
const audit = (tenantId: string, actorUid: string, action: string, targetUid: string) => masterDb().collection("audit_logs").add({ tenantId, actorUid, action, targetUid, timestamp: FieldValue.serverTimestamp() });
export async function GET(req: Request) {
  const g = await guard(req); if (!g.me) return g.r;
  const s = await masterDb().collection("members").where("tenantId", "==", g.me.mem.tenantId).get();
  return j({ users: s.docs.map((d) => { const x = d.data(); return { id: d.id, name: x.name, email: x.email, role: x.role, active: x.active === true, professionalId: x.professionalId }; }) });
}
export async function POST(req: Request) {
  const g = await guard(req); if (!g.me) return g.r; const { uid, mem } = g.me, b = await req.json().catch(() => ({}));
  if (!mail(b.email) || typeof b.name !== "string" || !b.name.trim() || !ROLES.includes(b.role)) return j({ error: "bad_request" }, 400);
  if (b.role === "owner" && mem.role !== "owner") return j({ error: "forbidden" }, 403);
  const auth = masterAuth(), db = masterDb(), u = await auth.getUserByEmail(b.email).catch(() => auth.createUser({ email: b.email, displayName: b.name.trim() }));
  const ex = (await db.doc(`members/${u.uid}`).get()).data(); if (ex && ex.tenantId !== mem.tenantId) return j({ error: "email_in_use" }, 409);
  await db.doc(`members/${u.uid}`).set({ tenantId: mem.tenantId, name: b.name.trim(), email: b.email.toLowerCase(), role: b.role as RoleT, active: true, ...(b.professionalId ? { professionalId: String(b.professionalId) } : {}), createdAt: FieldValue.serverTimestamp() }, { merge: true });
  await audit(mem.tenantId, uid, "create_user", u.uid);
  return j({ ok: true, id: u.uid, resetLink: await auth.generatePasswordResetLink(b.email) });
}
export async function PATCH(req: Request) {
  const g = await guard(req); if (!g.me) return g.r; const { uid, mem } = g.me, b = await req.json().catch(() => ({})), db = masterDb();
  if (typeof b.id !== "string" || b.id === uid) return j({ error: "bad_request" }, 400); // não altera a si mesmo (evita perder o acesso)
  const t = (await db.doc(`members/${b.id}`).get()).data(); if (!t || t.tenantId !== mem.tenantId) return j({ error: "not_found" }, 404);
  if ((t.role === "owner" || b.role === "owner") && mem.role !== "owner") return j({ error: "forbidden" }, 403);
  const up: Record<string, unknown> = {};
  if (b.role !== undefined) { if (!ROLES.includes(b.role)) return j({ error: "bad_request" }, 400); up.role = b.role; }
  if (typeof b.active === "boolean") up.active = b.active;
  if (!Object.keys(up).length) return j({ error: "bad_request" }, 400);
  await db.doc(`members/${b.id}`).update(up);
  const auth = masterAuth(); if (typeof b.active === "boolean") await auth.updateUser(b.id, { disabled: !b.active }).catch(() => {});
  await auth.revokeRefreshTokens(b.id).catch(() => {}); // a sessão no cliente expira em até 1h (vida do ID token)
  try { const cfg = (await db.doc(`tenant_configs/${mem.tenantId}`).get()).data(); await getAuth(await tenantApp(mem.tenantId, cfg?.firebase?.projectId)).revokeRefreshTokens(b.id); } catch {}
  await audit(mem.tenantId, uid, "update_user", b.id);
  return j({ ok: true });
}
