"use client";
import { useState } from "react";
import { Actions, Field, Modal, formData } from "@/components/modal";
import { Card, Page, Table, Tag } from "@/components/ui";
import { MODULES } from "@/config/modules";
import { SEGMENTS, SegmentId } from "@/config/segments";
import { ROLE_LABEL } from "@/lib/permissions";
import { useAuth } from "@/lib/auth/auth-provider";
import { uid, useStore } from "@/lib/store";
import { PLANS, PlanId, useTenant } from "@/lib/tenant/tenant-config";
import { Role } from "@/types";
export default function Configuracoes() {
  const { tenant, level, update, mode } = useTenant(), { data, add, patch, setHour } = useStore(), { user: auth } = useAuth(), locked = mode !== "demo"; const [open, setOpen] = useState(false);
  return (
    <Page title="Configurações" action="+ Novo usuário" onAction={() => setOpen(true)}>
      <Card title="Identidade do estabelecimento"><div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <Field label="Nome da empresa"><input className="inp" value={tenant.name} onChange={(e) => update({ name: e.target.value || "Nome da empresa" })} /></Field>
        <Field label="Cor principal"><input type="color" className="inp h-10 p-1" value={tenant.accent} onChange={(e) => update({ accent: e.target.value })} /></Field>
        <Field label="Plano"><select className="inp" disabled={locked} value={tenant.plan} onChange={(e) => update({ plan: e.target.value as PlanId })}>{Object.entries(PLANS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
        <Field label="Tema"><select className="inp" value={tenant.theme} onChange={(e) => update({ theme: e.target.value as "auto" | "light" | "dark" })}><option value="auto">Automático</option><option value="light">Claro</option><option value="dark">Escuro</option></select></Field></div>
        <h3 className="mb-2 mt-5 font-semibold">Setor</h3>
        <div className="flex flex-wrap gap-2">{(Object.keys(SEGMENTS) as SegmentId[]).map((k) => <button key={k} disabled={locked} onClick={() => update({ segment: k, accent: SEGMENTS[k].accent })} className={`rounded-xl border px-4 py-2 ${k === tenant.segment ? "border-ac bg-soft font-semibold text-ac" : "border-bd bg-card"}`}>{SEGMENTS[k].label}</button>)}</div>
        <p className="mt-2 text-xs text-mu">{locked ? "Plano e setor são definidos pela CodariaDev para este estabelecimento." : "Trocar o setor recarrega os dados de demonstração."}</p>
        <h3 className="mb-2 mt-5 font-semibold">Módulos habilitados</h3>
        <div className="flex flex-wrap gap-1.5">{MODULES.filter((m) => m.level <= level && m.href !== "/configuracoes").map((m) => <Tag key={m.href}>{m.label}</Tag>)}</div></Card>
      <Card title="Horário de funcionamento">{data.hours.map((h, i) => <div key={h.day} className="flex flex-wrap items-center gap-3 border-b border-bd py-2"><label className="flex w-36 items-center gap-2"><input type="checkbox" checked={h.on} onChange={(e) => setHour(i, { on: e.target.checked })} />{h.day}</label>{h.on ? <><input type="time" aria-label={`Abertura ${h.day}`} className="inp w-auto py-1" value={h.open} onChange={(e) => setHour(i, { open: e.target.value })} /><span>às</span><input type="time" aria-label={`Fechamento ${h.day}`} className="inp w-auto py-1" value={h.close} onChange={(e) => setHour(i, { close: e.target.value })} /></> : <span className="text-mu">Fechado</span>}</div>)}</Card>
      <Card title="Usuários e permissões"><Table head={["Nome", "E-mail", "Perfil", "Status"]} rows={data.users.map((u) => [u.name, u.email,
        <select key="r" aria-label={`Perfil de ${u.name}`} className="inp w-auto py-1" disabled={u.role === "owner" && auth?.role !== "owner"} value={u.role} onChange={(e) => patch("users", u.id, { role: e.target.value as Role })}>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>,
        <button key="s" onClick={() => patch("users", u.id, { active: !u.active })}><Tag tone={u.active ? "ok" : "bad"}>{u.active ? "Ativo" : "Inativo"}</Tag></button>])} /><p className="mt-3 text-xs text-mu">A visibilidade na interface não substitui as Security Rules do Firebase.</p></Card>
      {open && <Modal title="Novo usuário" onClose={() => setOpen(false)}><form className="grid gap-3" onSubmit={(e) => { const f = formData(e); add("users", { id: uid(), name: f.name, email: f.email, role: f.role as Role, active: true }); setOpen(false); }}>
        <Field label="Nome"><input name="name" required className="inp" /></Field><Field label="E-mail"><input name="email" type="email" required className="inp" /></Field><Field label="Perfil"><select name="role" className="inp" defaultValue="receptionist">{(Object.keys(ROLE_LABEL) as Role[]).filter((r) => r !== "owner").map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field><Actions onCancel={() => setOpen(false)} /></form></Modal>}
    </Page>
  );
}
