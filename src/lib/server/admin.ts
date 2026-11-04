import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { decrypt } from "@/lib/server/secrets";
// Somente servidor. Em desenvolvimento com emuladores não precisa de credenciais.
export const EMU = process.env.NEXT_PUBLIC_USE_EMULATORS === "true" && process.env.NODE_ENV !== "production";
function masterApp(): App {
  return getApps().find((a) => a.name === "master") ?? (EMU
    ? initializeApp({ projectId: process.env.MASTER_PROJECT_ID ?? "demo-master" }, "master")
    : initializeApp({ credential: cert(JSON.parse(process.env.MASTER_FIREBASE_SERVICE_ACCOUNT ?? "{}")) }, "master"));
}
export const masterAuth = () => getAuth(masterApp());
export const masterDb = () => getFirestore(masterApp());
// App Admin do projeto Firebase do CLIENTE (usado só para emitir/revogar tokens de sessão — nunca para ler dados).
export async function tenantApp(tenantId: string, projectId: string): Promise<App> {
  const name = "t:" + tenantId, ex = getApps().find((a) => a.name === name); if (ex) return ex;
  if (EMU) return initializeApp({ projectId }, name);
  const s = (await masterDb().doc(`tenant_secrets/${tenantId}`).get()).data();
  if (!s?.enc) throw new Error("tenant_secret_missing");
  return initializeApp({ credential: cert(JSON.parse(decrypt(s.enc))) }, name);
}
export const ROLES = ["owner", "admin", "manager", "professional", "receptionist"] as const;
export type RoleT = (typeof ROLES)[number];
export async function caller(req: Request) {
  const a = req.headers.get("authorization") ?? "", token = a.startsWith("Bearer ") ? a.slice(7) : "";
  if (!token) return null;
  try {
    const uid = (await masterAuth().verifyIdToken(token, true)).uid, mem = (await masterDb().doc(`members/${uid}`).get()).data();
    if (!mem || mem.active !== true || !ROLES.includes(mem.role) || typeof mem.tenantId !== "string") return null;
    return { uid, mem: mem as { tenantId: string; role: RoleT; name: string; email: string; professionalId?: string } };
  } catch { return null; }
}
