// Verificação pré-deploy: node scripts/validate-project.mjs   (use as variáveis do ambiente alvo)
import { existsSync, readFileSync } from "node:fs";
const errs = [], warn = [];
for (const f of ["firebase/firestore.rules", "firebase/storage.rules", "firebase/firestore.indexes.json", "firebase.json"]) if (!existsSync(f)) errs.push(`Arquivo ausente: ${f}`);
if (existsSync("firebase/firestore.rules") && /allow\s+[^;]*if\s+true/.test(readFileSync("firebase/firestore.rules", "utf8"))) errs.push("firestore.rules contém 'if true'.");
const prod = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
if (prod && process.env.NEXT_PUBLIC_USE_EMULATORS === "true") errs.push("NEXT_PUBLIC_USE_EMULATORS=true em produção.");
if (prod) {
  try { const m = JSON.parse(process.env.NEXT_PUBLIC_MASTER_FIREBASE ?? ""); if (!m.apiKey || !m.projectId) throw 0; } catch { errs.push("NEXT_PUBLIC_MASTER_FIREBASE ausente/ inválida."); }
  try { if (!JSON.parse(process.env.MASTER_FIREBASE_SERVICE_ACCOUNT ?? "").private_key) throw 0; } catch { errs.push("MASTER_FIREBASE_SERVICE_ACCOUNT ausente/ inválida."); }
  if (Buffer.from(process.env.TENANT_SECRETS_KEY ?? "", "base64").length !== 32) errs.push("TENANT_SECRETS_KEY deve ter 32 bytes em base64.");
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) errs.push("Variáveis de emulador definidas em produção.");
}
warn.forEach((w) => console.warn("⚠", w)); errs.forEach((e) => console.error("✗", e));
if (errs.length) process.exit(1); console.log("✓ Projeto válido para deploy.");
