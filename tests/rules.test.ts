import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, it } from "vitest";
// Rode com: npm run test:rules (precisa de Java). Papel vem dos claims do token de sessão.
let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-rules", firestore: { rules: readFileSync("firebase/firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await db.doc("customers/c1").set({ name: "X" }); await db.doc("transactions/t1").set({ amount: 1 });
    await db.doc("appointments/a1").set({ professionalId: "p0" }); await db.doc("appointments/a2").set({ professionalId: "p1" });
  });
});
afterAll(() => env.cleanup());
const as = (role: string, extra: object = {}) => env.authenticatedContext("u-" + role, { role, ...extra }).firestore();
describe("firestore.rules (claims)", () => {
  it("nega anônimo", () => assertFails(env.unauthenticatedContext().firestore().doc("customers/c1").get()));
  it("nega usuário sem claim de papel", () => assertFails(env.authenticatedContext("x").firestore().doc("customers/c1").get()));
  it("nega papel desconhecido nas escritas", () => assertFails(as("hacker").doc("customers/c9").set({ name: "Y" })));
  it("recepção lê clientes mas não o financeiro", async () => { await assertSucceeds(as("receptionist").doc("customers/c1").get()); await assertFails(as("receptionist").doc("transactions/t1").get()); });
  it("gerente escreve serviços; recepção não", async () => { await assertSucceeds(as("manager").doc("services/s1").set({ name: "A" })); await assertFails(as("receptionist").doc("services/s2").set({ name: "B" })); });
  it("só admin altera configurações", async () => { await assertSucceeds(as("admin").doc("settings/main").set({ hours: [] })); await assertFails(as("manager").doc("settings/main").set({ hours: [] })); });
  it("profissional lê só a própria agenda", async () => { const p = as("professional", { pid: "p0" }); await assertSucceeds(p.doc("appointments/a1").get()); await assertFails(p.doc("appointments/a2").get()); });
  it("audit_logs: cria sim, altera não", async () => { await assertSucceeds(as("owner").collection("audit_logs").add({ action: "x" })); await assertFails(as("owner").doc("audit_logs/z").update({ action: "y" })); });
});
