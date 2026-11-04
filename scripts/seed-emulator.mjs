// Popula o Emulator Suite: projeto MASTER "demo-master" (usuários, empresas) + um projeto "demo-<slug>" por cliente (dados). Rodado por `npm run local`.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080"; process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
const T = [
  { slug: "clientea", name: "Barbearia Alpha", segment: "barbearia", plan: "premium", accent: "#7c4dff", pros: ["Lucas Silva", "Matheus Santos", "Rafael Costa"], cli: ["Bruno Costa", "Gabriel Souza", "Felipe Santos", "Lucas Ferreira", "Rafael Lima", "Thiago Alves"], svc: [["Corte", 45, 40], ["Barba", 35, 30], ["Corte + Barba", 70, 65]], prod: [["Pomada modeladora", 14, 5, 32], ["Óleo para barba", 3, 5, 28]] },
  { slug: "clienteb", name: "Salão Bella", segment: "salao", plan: "profissional", accent: "#b13fd6", pros: ["Ana Costa", "Bruna Almeida", "Carla Souza"], cli: ["Juliana Mendes", "Camila Souza", "Patrícia Lima", "Fernanda Alves", "Beatriz Santos", "Mariana Costa"], svc: [["Corte + escova", 120, 90], ["Manicure", 60, 50], ["Hidratação capilar", 150, 70]], prod: [["Máscara capilar", 9, 5, 45], ["Shampoo", 4, 6, 38]] },
  { slug: "clientec", name: "Estúdio Aura", segment: "estetica", plan: "essencial", accent: "#0e9f8e", pros: ["Marina Rocha", "Paula Nunes", "Renata Dias"], cli: ["Alice Barros", "Helena Ramos", "Larissa Melo", "Isabela Cruz", "Vanessa Reis", "Tatiane Luz"], svc: [["Limpeza de pele", 140, 60], ["Drenagem linfática", 160, 60], ["Peeling", 220, 45]], prod: [["Sérum vitamina C", 11, 5, 95], ["Protetor solar", 3, 6, 48]] },
];
const USERS = [["dono", "owner"], ["gerente", "manager"], ["recepcao", "receptionist"], ["profissional", "professional"]];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const master = initializeApp({ projectId: "demo-master" }, "master"), mAuth = getAuth(master), mDb = getFirestore(master);
{ const e = "admin@codaria.test", u = await mAuth.getUserByEmail(e).catch(() => mAuth.createUser({ email: e, password: "123456", displayName: "Admin" })); await mDb.doc(`admins/${u.uid}`).set({ active: true, role: "superadmin", name: "Admin", email: e }); console.log("✓ painel: http://localhost:3000/admin  admin@codaria.test / 123456"); }
for (const t of T) {
  const app = initializeApp({ projectId: "demo-" + t.slug }, t.slug), db = getFirestore(app), b = db.batch();
  await mDb.doc(`tenants/${t.slug}`).set({ businessName: t.name, segment: t.segment, plan: t.plan, status: "active" });
  await mDb.doc(`tenant_configs/${t.slug}`).set({ theme: { accent: t.accent }, firebase: { apiKey: "demo-key", authDomain: `demo-${t.slug}.firebaseapp.com`, projectId: "demo-" + t.slug, storageBucket: `demo-${t.slug}.appspot.com`, appId: "demo-" + t.slug } });
  for (const [n, role] of USERS) {
    const email = `${n}@${t.slug}.test`, u = await mAuth.getUserByEmail(email).catch(() => mAuth.createUser({ email, password: "123456", displayName: n }));
    await mDb.doc(`members/${u.uid}`).set({ tenantId: t.slug, name: n[0].toUpperCase() + n.slice(1), email, role, active: true, ...(role === "professional" ? { professionalId: "p0" } : {}) });
  }
  t.pros.forEach((name, i) => b.set(db.doc(`professionals/p${i}`), { name, rate: 50 - i * 5, active: true, specialties: [], createdAt: Timestamp.now() }));
  t.svc.forEach(([name, price, d], i) => b.set(db.doc(`services/s${i}`), { name, price, durationMinutes: d, category: "Geral", active: true, createdAt: Timestamp.now() }));
  t.cli.forEach((name, i) => b.set(db.doc(`customers/c${i}`), { name, phone: `(48) 9983${i}-06${i}0`, lastVisit: ymd(new Date(Date.now() - (i * 6 + 1) * 864e5)), createdAt: Timestamp.now() }));
  t.prod.forEach(([name, q, m, p], i) => b.set(db.doc(`products/pr${i}`), { name, quantity: q, minQuantity: m, salePrice: p, createdAt: Timestamp.now() }));
  ["Traga um amigo", "Cliente sumido: 30 dias"].forEach((name, i) => b.set(db.doc(`campaigns/cp${i}`), { name, active: true }));
  const st = ["concluido", "confirmado", "agendado"];
  for (let i = 0; i < 8; i++) {
    const s = t.svc[i % t.svc.length], day = new Date(); if (i >= 5) day.setDate(day.getDate() - (i - 4));
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8 + (i % 5) * 2, 0), end = new Date(start.getTime() + s[2] * 60000), status = i >= 5 ? "concluido" : st[i % 3];
    b.set(db.doc(`appointments/a${i}`), { customerId: `c${i % t.cli.length}`, professionalId: `p${i % t.pros.length}`, serviceId: `s${i % t.svc.length}`, startAt: Timestamp.fromDate(start), endAt: Timestamp.fromDate(end), status, priceSnapshot: s[1], createdAt: Timestamp.now() });
    if (status === "concluido") b.set(db.doc(`transactions/t${i}`), { type: "in", category: "Atendimento", desc: `${s[0]} · ${t.cli[i % t.cli.length]}`, amount: s[1], date: ymd(day), createdAt: Timestamp.now() });
  }
  b.set(db.doc("transactions/o1"), { type: "out", category: "Aluguel", desc: "Aluguel do espaço", amount: 1800, date: ymd(new Date()), createdAt: Timestamp.now() });
  b.set(db.doc("settings/main"), { hours: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map((day, i) => ({ day, on: i < 6, open: "09:00", close: "19:00" })) });
  await b.commit(); console.log(`✓ ${t.slug}: empresa ${t.name} → (dono|gerente|recepcao|profissional)@${t.slug}.test / 123456`);
}
