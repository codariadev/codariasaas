export function LineChart({ data, h = 170 }: { data: number[]; h?: number }) {
  const w = 500, m = Math.max(...data, 1);
  const p = data.map((v, i) => `${(i * w) / (data.length - 1)},${h - 8 - (v / m) * (h - 20)}`).join(" ");
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Gráfico de linha"><polygon points={`0,${h} ${p} ${w},${h}`} fill="var(--ac)" opacity=".13" /><polyline points={p} fill="none" stroke="var(--ac)" strokeWidth="2.5" /></svg>;
}
export function BarChart({ a, b, h = 170 }: { a: number[]; b: number[]; h?: number }) {
  const w = 500, m = Math.max(...a, ...b, 1), bw = w / a.length;
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Receitas e despesas">{a.map((v, i) => <g key={i}>
    <rect x={i * bw + 4} y={h - (v / m) * (h - 10)} width={bw / 2 - 4} height={(v / m) * (h - 10)} rx="3" fill="var(--ac)" />
    <rect x={i * bw + bw / 2 - 3} y={h - (b[i] / m) * (h - 10)} width={bw / 2 - 4} height={(b[i] / m) * (h - 10)} rx="3" fill="var(--ac)" opacity=".35" /></g>)}</svg>;
}
