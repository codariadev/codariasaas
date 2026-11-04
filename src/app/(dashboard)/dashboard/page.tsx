"use client";
import Link from "next/link";
import { Card, Kpi, Page, Tag, statusTone } from "@/components/ui";
import { LineChart } from "@/components/charts";
import { daysSince, hh, last7, today, useStore } from "@/lib/store";
import { useTenant } from "@/lib/tenant/tenant-config";
import { money } from "@/lib/utils";
import { STATUS_LABEL } from "@/types";
export default function Dashboard() {
  const { data } = useStore(),
    { level } = useTenant();
  const rev = data.txs
    .filter((x) => x.type === "in")
    .reduce((s, x) => s + x.amount, 0);
  const done = data.appointments.filter((a) => a.status === "concluido").length;
  const active = data.customers.filter(
    (c) => daysSince(c.lastVisit) <= 30,
  ).length;
  const hoje = data.appointments
    .filter(
      (a) =>
        a.date === today() &&
        a.status !== "bloqueio" &&
        a.status !== "cancelado",
    )
    .sort((a, b) => a.start - b.start);
  const cn = (id: string) =>
      data.customers.find((c) => c.id === id)?.name ?? "—",
    sn = (id: string) => data.services.find((s) => s.id === id)?.name ?? "—";
  const low = data.products.filter((p) => p.qty < p.min),
    idle = data.customers.filter((c) => daysSince(c.lastVisit) > 30);
  const recent = [...data.customers]
    .sort((a, b) => a.lastVisit.localeCompare(b.lastVisit))
    .reverse()
    .slice(0, 3);
  return (
    <Page title="Dashboard">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
        <Kpi label="Faturamento registrado" value={money(rev)} />
        <Kpi label="Agendamentos hoje" value={String(hoje.length)} />
        <Kpi label="Clientes ativos (30 dias)" value={String(active)} />
        <Kpi label="Ticket médio" value={money(done ? rev / done : 0)} />
      </div>
      <div className="grid gap-3.5 lg:grid-cols-[1.5fr_1fr]">
        {level >= 1 ? (
          <Card title="Faturamento dos últimos 7 dias">
            <LineChart data={last7(data.txs, "in")} />
          </Card>
        ) : (
          <Card title="Atalhos">
            <div className="flex flex-wrap gap-2">
              <Link className="btn" href="/agenda">
                Agenda
              </Link>
              <Link className="btn" href="/clientes">
                Clientes
              </Link>
              <Link className="btn" href="/financeiro">
                Financeiro
              </Link>
            </div>
          </Card>
        )}
        <Card title="Agendamentos de hoje">
          {hoje.length === 0 && (
            <p className="text-mu">Nenhum atendimento hoje.</p>
          )}
          {hoje.slice(0, 6).map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 border-b border-bd py-2"
            >
              <b>{hh(a.start)}</b>
              <div className="flex-1">
                {cn(a.customerId)}
                <br />
                <small className="text-mu">{sn(a.serviceId)}</small>
              </div>
              <Tag tone={statusTone(a.status)}>{STATUS_LABEL[a.status]}</Tag>
            </div>
          ))}
          <Link href="/agenda" className="mt-2 block text-sm text-ac">
            Ver agenda →
          </Link>
        </Card>
      </div>
      <div className="grid gap-3.5 lg:grid-cols-2">
        <Card title="Clientes recentes">
          {recent.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-1.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-soft font-bold text-ac">
                {c.name[0]}
              </span>
              <div>
                {c.name}
                <br />
                <small className="text-mu">
                  Última visita há {daysSince(c.lastVisit)} dia(s)
                </small>
              </div>
            </div>
          ))}
        </Card>
        {level >= 1 && (
          <Card title="Alertas">
            {low.length + idle.length === 0 && (
              <p className="text-mu">Tudo em dia.</p>
            )}
            {low.map((p) => (
              <p key={p.id}>
                <Tag tone="warn">Estoque</Tag> Repor {p.name} ({p.qty} un.)
              </p>
            ))}
            {idle.length > 0 && (
              <p className="mt-1">
                <Tag tone="bad">CRM</Tag> {idle.length} cliente(s) sem retorno
                há mais de 30 dias
              </p>
            )}
          </Card>
        )}
      </div>
    </Page>
  );
}
