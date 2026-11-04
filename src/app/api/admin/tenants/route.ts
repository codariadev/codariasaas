import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { EMU, ROLES, masterAuth, masterDb } from "@/lib/server/admin";
import { adminGuard } from "@/lib/server/admin-auth";
import { cleanWeb, isBlocked, parseSa, probe } from "@/lib/server/probe";
import { encrypt } from "@/lib/server/secrets";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const j = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });
const SEGS = ["barbearia", "salao", "estetica"], PLANS = ["essencial", "profissional", "premium"];
const mail = (e: unknown): e is string => typeof e === "string" && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export async function GET(req: Request) {
  const g = await adminGuard(req); if (!("a" in g)) return g.r; const db = masterDb();
  const ts = await db.collection("tenants").get();
  const rows = await Promise.all(ts.docs.map(async (d) => {
    const x = d.data(), q = db.collection("members").where("tenantId", "==", d.id);
    const [cnt, own] = await Promise.all([q.count().get(), q.where("role", "==", "owner").limit(1).get()]);
    return { id: d.id, name: x.businessName, segment: x.segment, plan: x.plan, status: x.status, members: cnt.data().count, owner: own.docs[0]?.data().email ?? null };
  }));
  return j({ tenants: rows.sort((a, b) => String(a.name).localeCompare(String(b.name))) });
}
// Cadastro guiado: valida credenciais → (dryRun só verifica) → grava empresa, chave cifrada e dono → devolve o link de senha.
export async function POST(req: Request) {
  const g = await adminGuard(req); if (!("a" in g)) return g.r; const b = await req.json().catch(() => ({})), id = String(b.id ?? "").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(id) || !String(b.name ?? "").trim() || !SEGS.includes(b.segment) || !PLANS.includes(b.plan) || !mail(b.ownerEmail) || !String(b.ownerName ?? "").trim() || !/^#[0-9a-f]{6}$/i.test(b.accent ?? "#7c4dff")) return j({ error: "dados_invalidos" }, 400);
  const web = cleanWeb(b.web), sa = parseSa(b.sa);
  if (!web) return j({ error: "config_web_invalida" }, 400);
  if (!EMU && !sa) return j({ error: "chave_invalida" }, 400);
  const checks = await probe(web, sa), blocked = isBlocked(checks, b.force === true);
  if (b.dryRun === true) return j({ ok: !blocked, checks });
  if (blocked) return j({ error: "verificacao_falhou", checks }, 422);
  const db = masterDb(), auth = masterAuth();
  if ((await db.doc(`tenants/${id}`).get()).exists) return j({ error: "id_em_uso" }, 409);
  let u = await auth.getUserByEmail(b.ownerEmail).catch(() => null);
  if (u && (await db.doc(`members/${u.uid}`).get()).exists) return j({ error: "email_em_uso" }, 409);
  u ??= await auth.createUser({ email: b.ownerEmail, displayName: String(b.ownerName).trim() });
  await db.doc(`tenants/${id}`).set({ businessName: String(b.name).trim(), segment: b.segment, plan: b.plan, status: "active", createdAt: FieldValue.serverTimestamp() });
  await db.doc(`tenant_configs/${id}`).set({ theme: { accent: b.accent ?? "#7c4dff" }, firebase: web });
  if (sa && (!EMU || process.env.TENANT_SECRETS_KEY)) await db.doc(`tenant_secrets/${id}`).set({ enc: encrypt(JSON.stringify(sa)), updatedAt: FieldValue.serverTimestamp() });
  await db.doc(`members/${u.uid}`).set({ tenantId: id, name: String(b.ownerName).trim(), email: b.ownerEmail.toLowerCase(), role: ROLES[0], active: true, createdAt: FieldValue.serverTimestamp() });
  await db.collection("audit_logs").add({ tenantId: id, actorUid: g.a.uid, action: "tenant_create", timestamp: FieldValue.serverTimestamp() });
  return j({ ok: true, id, checks, resetLink: await auth.generatePasswordResetLink(b.ownerEmail) });
}
