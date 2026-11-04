"use client";
import { Card, Kpi, Page } from "@/components/ui";
import { LineChart } from "@/components/charts";
import { last7, useStore } from "@/lib/store";
import { money } from "@/lib/utils";
const COL = ["var(--ac)", "#e08bd0", "#6fc2ff", "#ffc861"];
export default function Relatorios() {
  const { data } = useStore();
  const done = data.appointments.filter((a) => a.status === "concluido"),
    rev = done.reduce((s, a) => s + a.price, 0);
  const rank = data.services
      .map((s) => ({
        name: s.name,
        n: done.filter((a) => a.serviceId === s.id).length,
      }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 4),
    tot = rank.reduce((s, r) => s + r.n, 0) || 1;
  const c = 2 * Math.PI * 40;
  let off = 0;
  return (
    <Page title="Relatórios">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
        <Kpi label="Atendimentos concluídos" value={String(done.length)} />
        <Kpi label="Faturamento" value={money(rev)} />
        <Kpi
          label="Ticket médio"
          value={money(done.length ? rev / done.length : 0)}
        />
      </div>
      <div className="grid gap-3.5 lg:grid-cols-[1.5fr_1fr]">
        <Card title="Faturamento por dia">
          <LineChart data={last7(data.txs, "in")} />
        </Card>
        <Card title="Serviços mais realizados">
          <div className="flex items-center gap-4">
            <svg
              viewBox="0 0 120 120"
              width="150"
              role="img"
              aria-label="Serviços mais realizados"
            >
              <g transform="rotate(-90 60 60)">
                {rank.map((r, i) => {
                  const d = (r.n / tot) * c,
                    el = (
                      <circle
                        key={r.name}
                        cx="60"
                        cy="60"
                        r="40"
                        fill="none"
                        stroke={COL[i]}
                        strokeWidth="18"
                        strokeDasharray={`${d} ${c - d}`}
                        strokeDashoffset={-off}
                      />
                    );
                  off += d;
                  return el;
                })}
              </g>
            </svg>
            <div>
              {rank.map((r, i) => (
                <div key={r.name}>
                  <span style={{ color: COL[i] }}>●</span> {r.name}{" "}
                  <b>{Math.round((r.n / tot) * 100)}%</b>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
      <Card title="Produção por profissional">
        {data.professionals.map((p) => {
          const v = done
            .filter((a) => a.professionalId === p.id)
            .reduce((s, a) => s + a.price, 0);
          return (
            <div key={p.id} className="mb-2">
              <div className="flex justify-between text-sm">
                <span>{p.name}</span>
                <b>{money(v)}</b>
              </div>
              <div className="h-2 rounded bg-bd">
                <div
                  className="h-2 rounded bg-ac"
                  style={{ width: `${rev ? (v / rev) * 100 : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </Card>
    </Page>
  );
}
