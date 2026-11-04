"use client";
import { useState } from "react";
import { Actions, Field, Modal, formData } from "@/components/modal";
import { Card, Page, Table, Tag } from "@/components/ui";
import { uid, useStore } from "@/lib/store";
import { money } from "@/lib/utils";
export default function Estoque() {
  const { data, add, patch } = useStore(); const [m, setM] = useState<"new" | string | null>(null), [err, setErr] = useState("");
  const cur = m && m !== "new" ? data.products.find((p) => p.id === m) : undefined, low = data.products.filter((p) => p.qty < p.min);
  return (
    <Page title="Estoque" action="+ Novo produto" onAction={() => setM("new")}>
      {low.length > 0 && <p className="rounded-xl border border-warn bg-warn/10 p-3">⚠ Reposição necessária: {low.map((p) => p.name).join(", ")}</p>}
      <Card><Table head={["Produto", "Saldo", "Mínimo", "Venda", "Situação", ""]} rows={data.products.map((p) => [p.name, p.qty, p.min, money(p.price), <Tag key="t" tone={p.qty < p.min ? "warn" : "ok"}>{p.qty < p.min ? "Repor" : "Em dia"}</Tag>, <button key="b" className="text-ac" onClick={() => { setErr(""); setM(p.id); }}>Movimentar</button>])} /></Card>
      {m === "new" && <Modal title="Novo produto" onClose={() => setM(null)}><form className="grid gap-3" onSubmit={(e) => { const f = formData(e); add("products", { id: uid(), name: f.name, qty: Number(f.qty), min: Number(f.min), price: Number(f.price) }); setM(null); }}>
        <Field label="Nome"><input name="name" required className="inp" /></Field><div className="grid grid-cols-3 gap-3"><Field label="Saldo"><input name="qty" type="number" min="0" required defaultValue={0} className="inp" /></Field><Field label="Mínimo"><input name="min" type="number" min="0" required defaultValue={5} className="inp" /></Field><Field label="Venda (R$)"><input name="price" type="number" min="0" step="0.01" required className="inp" /></Field></div><Actions onCancel={() => setM(null)} /></form></Modal>}
      {cur && <Modal title={`Movimentar: ${cur.name}`} onClose={() => setM(null)}><form className="grid gap-3" onSubmit={(e) => { const f = formData(e), q = Number(f.qty) * (f.type === "out" ? -1 : 1); if (cur.qty + q < 0) return setErr("Saldo insuficiente para esta saída."); patch("products", cur.id, { qty: cur.qty + q }); setM(null); }}>
        <Field label="Tipo"><select name="type" className="inp"><option value="in">Entrada</option><option value="out">Saída</option></select></Field><Field label="Quantidade"><input name="qty" type="number" min="1" required defaultValue={1} className="inp" /></Field><Field label="Motivo"><input name="reason" className="inp" placeholder="Compra, uso, venda…" /></Field>{err && <p role="alert" className="text-sm text-bad">{err}</p>}<Actions onCancel={() => setM(null)} /></form></Modal>}
    </Page>
  );
}
