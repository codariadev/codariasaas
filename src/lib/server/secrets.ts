import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
// Chave de serviço de cada cliente fica CIFRADA (AES-256-GCM) no Firebase master; a chave de cifra vem do ambiente (TENANT_SECRETS_KEY, 32 bytes em base64).
const key = () => { const k = Buffer.from(process.env.TENANT_SECRETS_KEY ?? "", "base64"); if (k.length !== 32) throw new Error("TENANT_SECRETS_KEY inválida (32 bytes em base64)"); return k; };
export const encrypt = (t: string) => { const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key(), iv), ct = Buffer.concat([c.update(t, "utf8"), c.final()]); return [iv, c.getAuthTag(), ct].map((b) => b.toString("base64")).join("."); };
export const decrypt = (s: string) => { const [iv, tag, ct] = s.split(".").map((x) => Buffer.from(x, "base64")), d = createDecipheriv("aes-256-gcm", key(), iv); d.setAuthTag(tag); return Buffer.concat([d.update(ct), d.final()]).toString("utf8"); };
