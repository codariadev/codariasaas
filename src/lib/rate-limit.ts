// Limitador simples em memória (melhor esforço; em serverless cada instância tem o seu). Em produção reforce com Vercel WAF/Upstash.
const hits = new Map<string, { n: number; reset: number }>();
export function limited(key: string, max = 10, windowMs = 60_000) {
  const now = Date.now(), h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + windowMs }); return false; }
  return ++h.n > max;
}
export const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
