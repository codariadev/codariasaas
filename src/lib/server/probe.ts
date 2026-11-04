import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { EMU, masterDb } from "@/lib/server/admin";
import { decrypt } from "@/lib/server/secrets";
export interface Check { name: string; status: "ok" | "warn" | "fail"; msg: string; forceable?: boolean }
const WEB_KEYS = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId", "measurementId"];
export function cleanWeb(w: unknown): Record<string, string> | null {
  if (!w || typeof w !== "object") return null;
  const o: Record<string, string> = {}; for (const k of WEB_KEYS) { const v = (w as Record<string, unknown>)[k]; if (typeof v === "string" && v.length < 300) o[k] = v; }
  return o.apiKey && o.projectId && /^[a-z0-9-]{4,40}$/.test(o.projectId) ? o : null;
}
export type Sa = { project_id: string; client_email: string; private_key: string; [k: string]: unknown };
export function parseSa(s: unknown): Sa | null {
  try { const o = typeof s === "string" ? JSON.parse(s) : s; return o?.type === "service_account" && o.private_key && o.client_email && o.project_id ? o : null; } catch { return null; }
}
export async function storedSa(id: string): Promise<Sa | null> {
  const s = (await masterDb().doc(`tenant_secrets/${id}`).get()).data(); return s?.enc ? parseSa(decrypt(s.enc)) : null;
}
// Verifica a conexão ANTES de gravar: chave x projeto, permissão de emitir sessões e regras do Firestore.
export async function probe(web: Record<string, string>, sa: Sa | null): Promise<Check[]> {
  const c: Check[] = [];
  if (!EMU) {
    if (!sa) return [{ name: "Chave de serviço", status: "fail", msg: "Chave de serviço ausente ou inválida." }];
    if (sa.project_id !== web.projectId) return [{ name: "Projeto", status: "fail", msg: `A chave é do projeto "${sa.project_id}", mas a config web é de "${web.projectId}".` }];
    c.push({ name: "Projeto", status: "ok", msg: `Chave e config web são do projeto ${web.projectId}.` });
  }
  const app = (() => { try { return initializeApp(EMU ? { projectId: web.projectId } : { credential: cert(sa as never) }, "probe:" + Math.random().toString(36).slice(2)); } catch { return null; } })();
  if (!app) c.push({ name: "Chave de serviço", status: "fail", msg: "Chave de serviço malformada." });
  else {
    try { const au = getAuth(app); await au.listUsers(1); await au.createCustomToken("probe", { role: "owner" }); c.push({ name: "Emissão de sessões", status: "ok", msg: "A chave consegue emitir sessões e gerenciar usuários no projeto." }); }
    catch { c.push({ name: "Emissão de sessões", status: "fail", msg: "A chave não tem permissão. Dê à conta de serviço o papel “Administrador do Firebase Authentication” e confirme que o Authentication foi iniciado no projeto." }); }
    finally { await deleteApp(app).catch(() => {}); }
  }
  if (EMU) return [...c, { name: "Firestore", status: "ok", msg: "Emulador: verificação de regras ignorada." }];
  try {
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(web.projectId)}/databases/(default)/documents/settings/main?key=${encodeURIComponent(web.apiKey)}`, { cache: "no-store" });
    const m = String(((await r.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? "");
    if (/has not been used|disabled|does not exist|not exist/i.test(m)) c.push({ name: "Firestore", status: "fail", msg: "O Firestore ainda não foi criado neste projeto (crie o banco no console)." });
    else if (r.status === 403) c.push({ name: "Firestore", status: "ok", msg: "Firestore criado e protegido (acesso anônimo negado)." });
    else if (r.status === 200 || r.status === 404) c.push({ name: "Firestore", status: "fail", forceable: true, msg: "Regras ABERTAS: o Firestore aceita leitura sem login. Publique as regras (aba Guia) antes de colocar a empresa no ar." });
    else c.push({ name: "Firestore", status: "warn", msg: `Não foi possível verificar o Firestore (HTTP ${r.status}).` });
  } catch { c.push({ name: "Firestore", status: "warn", msg: "Sem resposta ao verificar o Firestore." }); }
  return c;
}
export const isBlocked = (cs: Check[], force: boolean) => cs.some((x) => x.status === "fail" && !(x.forceable && force));
