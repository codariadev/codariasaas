// Cria (ou reativa) um administrador do painel /admin no Firebase MASTER.
// Uso: MASTER_FIREBASE_SERVICE_ACCOUNT="$(cat master-sa.json)" node scripts/create-admin.mjs <email> "<Nome>"
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
const [email, name = "Administrador"] = process.argv.slice(2);
if (!email) { console.error("Uso: node scripts/create-admin.mjs <email> \"<Nome>\""); process.exit(1); }
if (!process.env.MASTER_FIREBASE_SERVICE_ACCOUNT) { console.error("MASTER_FIREBASE_SERVICE_ACCOUNT ausente. Defina em .env.local (uma linha, entre aspas simples)."); process.exit(1); }
const app = initializeApp({ credential: cert(JSON.parse(process.env.MASTER_FIREBASE_SERVICE_ACCOUNT)) }), auth = getAuth(app);
const u = await auth.getUserByEmail(email).catch(() => auth.createUser({ email, displayName: name }));
await getFirestore(app).doc(`admins/${u.uid}`).set({ active: true, role: "superadmin", name, email, createdAt: FieldValue.serverTimestamp() }, { merge: true });
console.log(`✓ Admin ${email} pronto. Link para definir a senha (se for conta nova):\n${await auth.generatePasswordResetLink(email)}`);
