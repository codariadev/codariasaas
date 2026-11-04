// Uso: node scripts/deploy-rules.mjs <projectId>   (publica Rules + índices do projeto Firebase do CLIENTE)
import { spawnSync } from "node:child_process";
const [project] = process.argv.slice(2);
if (!project || project.startsWith("demo-")) { console.error("Informe o projectId real do cliente (não demo-*)."); process.exit(1); }
const r = spawnSync("npx", ["firebase-tools@13.22.1", "deploy", "--only", "firestore:rules,firestore:indexes,storage", "--project", project], { stdio: "inherit" });
process.exit(r.status ?? 1);
