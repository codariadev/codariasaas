"use client";
import { useState } from "react";
import { Actions, Field, Modal, formData } from "@/components/modal";
import { Card, Page, Table, Tag } from "@/components/ui";
import { uid, useStore } from "@/lib/store";
export default function Marketing() {
  const { data, add, patch } = useStore(); const [open, setOpen] = useState(false), [wait, setWait] = useState<{ n: string; p: string }[]>([]);
  return (
    <Page title="Marketing" action="+ Nova campanha" onAction={() => setOpen(true)}>
      <div className="grid gap-3.5 lg:grid-cols-[1.5fr_1fr]">
        <Card title="Campanhas e fidelização">{data.campaigns.map((c) => <div key={c.id} className="flex items-center border-b border-bd py-2.5"><span className="flex-1">{c.name}</span><button onClick={() => patch("campaigns", c.id, { active: !c.active })}><Tag tone={c.active ? "ok" : "bad"}>{c.active ? "Ativa" : "Pausada"}</Tag></button></div>)}
          <p className="mt-3 text-xs text-mu">Envio via API oficial do WhatsApp, com consentimento do cliente e tarifas do provedor.</p></Card>
        <Card title="Lembrete automático"><div className="max-w-xs rounded-xl bg-bg p-3"><p className="rounded-xl bg-card p-3">Olá, {data.customers[0]?.name.split(" ")[0]}! Seu horário está confirmado para 18/05 às 13:00.<br /><b>{data.services[0]?.name}</b><br />Em caso de imprevistos, nos avise com antecedência.</p></div></Card>
      </div>
      <Card title="Lista de espera"><form className="mb-3 flex flex-wrap gap-2" onSubmit={(e) => { const f = formData(e); setWait([...wait, { n: f.n, p: f.p }]); e.currentTarget.reset(); }}><input name="n" required placeholder="Nome" aria-label="Nome" className="inp max-w-[200px]" /><input name="p" required placeholder="Telefone" aria-label="Telefone" className="inp max-w-[200px]" /><button className="btn">Adicionar</button></form>
        <Table head={["Nome", "Telefone"]} empty="Ninguém na lista de espera." rows={wait.map((w) => [w.n, w.p])} /></Card>
      {open && <Modal title="Nova campanha" onClose={() => setOpen(false)}><form className="grid gap-3" onSubmit={(e) => { add("campaigns", { id: uid(), name: formData(e).name, active: true }); setOpen(false); }}><Field label="Nome da campanha"><input name="name" required className="inp" /></Field><Actions onCancel={() => setOpen(false)} /></form></Modal>}
    </Page>
  );
}
