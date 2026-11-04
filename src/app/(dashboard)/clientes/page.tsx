"use client";
import { useState } from "react";
import { Actions, Field, Modal, formData } from "@/components/modal";
import { Card, Page, Table, Tag } from "@/components/ui";
import { addDays, daysSince, hh, today, uid, useStore } from "@/lib/store";
import { useTenant } from "@/lib/tenant/tenant-config";
import { dmy, money } from "@/lib/utils";
import { STATUS_LABEL } from "@/types";
export default function Clientes() {
  const { data, add, patch, query, setQuery } = useStore(), { level } = useTenant();
  const [modal, setModal] = useState<"new" | string | null>(null);
  const rows = data.customers.filter((c) => (c.name + c.phone).toLowerCase().includes(query.toLowerCase())).map((c) => {
    const visits = data.appointments.filter((a) => a.customerId === c.id && a.status === "concluido").length, idle = daysSince(c.lastVisit) > 30;
    return [<button key="n" className="font-medium text-ac" onClick={() => setModal(c.id)}>{c.name}</button>, c.phone, dmy(c.lastVisit), ...(level >= 1 ? [visits, <Tag key="s" tone={idle ? "bad" : "ok"}>{idle ? "Inativo" : "Ativo"}</Tag>] : [])];
  });
  const cur = modal && modal !== "new" ? data.customers.find((c) => c.id === modal) : undefined;
  return (
    <Page title="Clientes" action="+ Novo cliente" onAction={() => setModal("new")}>
      <input className="inp max-w-xs" placeholder="Buscar cliente" aria-label="Buscar cliente" value={query} onChange={(e) => setQuery(e.target.value)} />
      <Card><Table head={["Nome", "Telefone", "Última visita", ...(level >= 1 ? ["Visitas", "Status"] : [])]} rows={rows} empty="Nenhum cliente encontrado. Cadastre o primeiro em “+ Novo cliente”." /></Card>
      {level < 1 && <p className="rounded-xl border border-dashed border-ac p-3 text-mu">CRM avançado (frequência, preferências e inativos) a partir do plano Profissional.</p>}
      {modal === "new" && <Modal title="Novo cliente" onClose={() => setModal(null)}><form className="grid gap-3" onSubmit={(e) => { const f = formData(e); add("customers", { id: uid(), name: f.name, phone: f.phone, email: f.email, notes: f.notes, lastVisit: today() }); setModal(null); }}>
        <Field label="Nome"><input name="name" required className="inp" /></Field><Field label="Telefone"><input name="phone" required className="inp" /></Field><Field label="E-mail (opcional)"><input name="email" type="email" className="inp" /></Field><Field label="Observações"><textarea name="notes" className="inp" rows={3} /></Field><Actions onCancel={() => setModal(null)} /></form></Modal>}
      {cur && <Modal title={cur.name} onClose={() => setModal(null)}>
        <p className="mb-3 text-sm text-mu">{cur.phone}{cur.email && ` · ${cur.email}`} · Cliente desde {dmy(addDays(cur.lastVisit, -90))}</p>
        <Field label="Observações / preferências"><textarea className="inp" rows={3} value={cur.notes ?? ""} onChange={(e) => patch("customers", cur.id, { notes: e.target.value })} /></Field>
        <h3 className="mb-2 mt-4 font-semibold">Histórico de atendimentos</h3>
        <Table head={["Data", "Serviço", "Status", "Valor"]} empty="Sem atendimentos." rows={data.appointments.filter((a) => a.customerId === cur.id).sort((a, b) => b.date.localeCompare(a.date)).map((a) => [`${dmy(a.date)} ${hh(a.start)}`, data.services.find((s) => s.id === a.serviceId)?.name, STATUS_LABEL[a.status], money(a.price)])} />
        <div className="mt-4 text-right"><button className="btn" onClick={() => setModal(null)}>Fechar</button></div>
      </Modal>}
    </Page>
  );
}
