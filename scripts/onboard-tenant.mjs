// Cadastra uma empresa no Firebase MASTER e cria o usuário dono.
// Uso: node scripts/onboard-tenant.mjs <tenantId> "<Nome da empresa>" <barbearia|salao|estetica> <essencial|profissional|premium> <chave-servico-cliente.json> <config-web-cliente.json> <emailDono> "<Nome do dono>"
// Env: MASTER_FIREBASE_SERVICE_ACCOUNT (JSON) e TENANT_SECRETS_KEY (32 bytes base64). A chave do cliente é gravada CIFRADA; nunca em texto claro.
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
const [id, name, segment, plan, saPath, webPath, email, owner = "Proprietário"] = process.argv.slice(2);
if (!id || !email || !webPath) { console.error("Uso: veja o cabeçalho do script."); process.exit(1); }
const key = Buffer.from(process.env.TENANT_SECRETS_KEY ?? "", "base64"); if (key.length !== 32) { console.error("TENANT_SECRETS_KEY inválida (gere com: openssl rand -base64 32)"); process.exit(1); }
const enc = (t) => { const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key, iv), ct = Buffer.concat([c.update(t, "utf8"), c.final()]); return [iv, c.getAuthTag(), ct].map((b) => b.toString("base64")).join("."); };
if (!process.env.MASTER_FIREBASE_SERVICE_ACCOUNT) { console.error("MASTER_FIREBASE_SERVICE_ACCOUNT ausente. Defina em .env.local (uma linha, entre aspas simples)."); process.exit(1); }
const app = initializeApp({ credential: cert(JSON.parse(process.env.MASTER_FIREBASE_SERVICE_ACCOUNT)) }, "master"), db = getFirestore(app), auth = getAuth(app);
const web = JSON.parse(readFileSync(webPath, "utf8"));
await db.doc(`tenants/${id}`).set({ businessName: name, segment, plan, status: "active", createdAt: FieldValue.serverTimestamp() }, { merge: true });
await db.doc(`tenant_configs/${id}`).set({ theme: { accent: "#7c4dff" }, firebase: web }, { merge: true });
await db.doc(`tenant_secrets/${id}`).set({ enc: enc(readFileSync(saPath, "utf8")), updatedAt: FieldValue.serverTimestamp() });
const u = await auth.getUserByEmail(email).catch(() => auth.createUser({ email, displayName: owner }));
await db.doc(`members/${u.uid}`).set({ tenantId: id, name: owner, email: email.toLowerCase(), role: "owner", active: true, createdAt: FieldValue.serverTimestamp() }, { merge: true });
console.log(`✓ ${name} cadastrada. Link para o dono definir a senha:\n${await auth.generatePasswordResetLink(email)}\nApague o arquivo da chave de serviço local após o cadastro.`);
