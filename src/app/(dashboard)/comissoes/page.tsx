"use client";
import { Card, Page, Table } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useTenant } from "@/lib/tenant/tenant-config";
import { money } from "@/lib/utils";
export default function Comissoes() {
  const { data, patch } = useStore(), { level } = useTenant();
  const rows = data.professionals.map((p) => {
    const ap = data.appointments.filter((a) => a.professionalId === p.id && a.status === "concluido"), base = ap.reduce((s, a) => s + a.price, 0);
    return [p.name, ap.length, money(base),
      level >= 2 ? <input key="r" type="number" min="0" max="100" aria-label={`Taxa de ${p.name}`} className="inp w-20 py-1" value={p.rate} onChange={(e) => patch("professionals", p.id, { rate: Number(e.target.value) })} /> : `${p.rate}%`,
      <b key="c">{money((base * p.rate) / 100)}</b>];
  });
  return <Page title="Comissões"><Card title="Demonstrativo (atendimentos concluídos)"><Table head={["Profissional", "Atendimentos", "Produção", "Taxa (%)", "Comissão"]} rows={rows} /></Card>{level >= 2 && <p className="text-xs text-mu">Premium: taxa editável por profissional. Regras por serviço serão definidas conforme escopo.</p>}</Page>;
}
