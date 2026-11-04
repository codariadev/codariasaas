"use client";
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { PublicTenantConfig, Role } from "@/types";
export interface AuthUser { uid: string; name: string; email: string; role: Role; professionalId?: string }
// Firebase MASTER (da CodariaDev): só autentica o usuário. A config web é pública. Sem ela, o sistema roda em modo demonstração.
const MASTER_CFG: Record<string, string> | null = (() => { try { const j = JSON.parse(process.env.NEXT_PUBLIC_MASTER_FIREBASE ?? ""); return j?.apiKey && j?.projectId ? j : null; } catch { return null; } })();
async function loadFb(name: string, cfg: Record<string, string>) {
  const [{ getTenantFirebase }, a, f] = await Promise.all([import("@/lib/firebase/client"), import("firebase/auth"), import("firebase/firestore")]);
  return { ...getTenantFirebase(name, cfg), a, f };
}
export type FB = Awaited<ReturnType<typeof loadFb>>;
interface AuthCtx { isAdmin: boolean; user: AuthUser | null; tenantCfg: PublicTenantConfig | null; fb: FB | null; ready: boolean; mode: "firebase" | "demo"; login: (email: string, password: string, role?: Role) => Promise<string | null>; logout: () => Promise<void>; resetPassword: (email: string) => Promise<void>; getToken: () => Promise<string | null> }
const Context = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Context);
const ERR: Record<string, string> = { "auth/invalid-credential": "E-mail ou senha incorretos.", "auth/wrong-password": "E-mail ou senha incorretos.", "auth/user-not-found": "E-mail ou senha incorretos.", "auth/invalid-email": "E-mail inválido.", "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente de novo.", "auth/user-disabled": "Usuário desativado.", "auth/network-request-failed": "Falha de conexão. Verifique sua internet." };
const SES: Record<string, string> = { no_access: "Este usuário não está vinculado a uma empresa ativa.", tenant_suspended: "O acesso desta empresa está suspenso.", rate_limited: "Muitas tentativas. Aguarde um minuto.", unauthorized: "Sessão inválida. Entre novamente.", server: "Não foi possível carregar sua empresa. Tente novamente." };
const FATAL = [SES.no_access, SES.tenant_suspended, SES.unauthorized];
const DEMO: PublicTenantConfig = { tenantId: "demo", slug: "demo", name: "Nome da empresa", segment: "barbearia", plan: "premium", accent: "#7c4dff", status: "active", mode: "demo" };
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null), [tenantCfg, setCfg] = useState<PublicTenantConfig | null>(null), [fb, setFb] = useState<FB | null>(null), [ready, setReady] = useState(false), [isAdmin, setIsAdmin] = useState(false);
  const master = useRef<FB | null>(null), bridging = useRef<Promise<string | null> | null>(null), clientFb = useRef<FB | null>(null), adminFlag = useRef(false);
  const clear = () => { setUser(null); setCfg(null); setFb(null); setIsAdmin(false); };
  // Ponte: ID token do master → /api/session → token customizado → login no Firebase do cliente (Rules usam o papel dos claims).
  const bridge = (u: { getIdToken: (force?: boolean) => Promise<string> }) => {
    if (bridging.current) return bridging.current;
    const p = (async (): Promise<string | null> => {
      try {
        const r = await fetch("/api/session", { method: "POST", headers: { authorization: `Bearer ${await u.getIdToken(true)}` } }), j = await r.json().catch(() => ({}));
        adminFlag.current = !!(r.ok && j.admin);
        if (r.ok && j.admin) { setIsAdmin(true); return null; }
        if (!r.ok) return SES[j.error] ?? SES.server;
        const cfg = j.tenant as PublicTenantConfig, c = await loadFb(cfg.tenantId, cfg.firebase!);
        await c.a.signInWithCustomToken(c.auth, j.customToken);
        clientFb.current = c; setFb(c); setCfg(cfg); setUser(j.user); return null;
      } catch { return SES.server; }
    })().finally(() => { bridging.current = null; });
    return (bridging.current = p);
  };
  useEffect(() => {
    if (!MASTER_CFG) { try { const s = localStorage.getItem("auth:demo"); if (s) { setUser(JSON.parse(s)); setCfg(DEMO); } } catch {} setReady(true); return; }
    let off = () => {}, dead = false;
    loadFb("master", MASTER_CFG).then((m) => {
      if (dead) return; master.current = m;
      off = m.a.onAuthStateChanged(m.auth, async (u) => {
        if (!u) { clear(); setReady(true); return; }
        const e = await bridge(u); if (e) { await m.a.signOut(m.auth); clear(); } setReady(true);
      });
    }).catch(() => setReady(true));
    return () => { dead = true; off(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Renova a sessão do cliente a cada 45 min; se o master negar (usuário desativado/empresa suspensa), encerra.
  useEffect(() => {
    if (!user || !MASTER_CFG) return;
    const id = setInterval(async () => { const u = master.current?.auth.currentUser; if (!u) return; const e = await bridge(u); if (e && FATAL.includes(e)) await logout(); }, 45 * 60_000);
    return () => clearInterval(id);
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps
  const login: AuthCtx["login"] = async (email, password, role) => {
    if (!MASTER_CFG) {
      if (password.length < 6) return "A senha deve ter ao menos 6 caracteres.";
      const u: AuthUser = { uid: email, email, name: email.split("@")[0], role: role ?? "owner" }; setUser(u); setCfg(DEMO);
      try { localStorage.setItem("auth:demo", JSON.stringify(u)); } catch {} return null;
    }
    const m = master.current ?? (await loadFb("master", MASTER_CFG)); master.current = m;
    try {
      const cred = await m.a.signInWithEmailAndPassword(m.auth, email, password), e = await bridge(cred.user);
      if (e) { await m.a.signOut(m.auth); clear(); return e; }
      return adminFlag.current ? "__admin__" : null;
    } catch (e) { return ERR[(e as { code?: string }).code ?? ""] ?? "Não foi possível entrar. Tente novamente."; }
  };
  const logout = async () => {
    try { localStorage.removeItem("auth:demo"); } catch {}
    if (clientFb.current) await clientFb.current.a.signOut(clientFb.current.auth).catch(() => {});
    if (master.current) await master.current.a.signOut(master.current.auth).catch(() => {});
    clear();
  };
  const resetPassword = async (email: string) => { if (!MASTER_CFG) return; try { const m = master.current ?? (await loadFb("master", MASTER_CFG)); master.current = m; await m.a.sendPasswordResetEmail(m.auth, email); } catch {} }; // resposta sempre genérica
  const getToken = async () => (await master.current?.auth.currentUser?.getIdToken()) ?? null;
  return <Context.Provider value={{ isAdmin, user, tenantCfg, fb, ready, mode: MASTER_CFG ? "firebase" : "demo", login, logout, resetPassword, getToken }}>{children}</Context.Provider>;
}
