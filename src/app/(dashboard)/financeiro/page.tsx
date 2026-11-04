"use client";
import { useState } from "react";
import { Actions, Field, Modal, formData } from "@/components/modal";
import { BarChart } from "@/components/charts";
import { Card, Kpi, Page, Table } from "@/components/ui";
import { addDays, last7, today, uid, useStore } from "@/lib/store";
import { useTenant } from "@/lib/tenant/tenant-config";
import { dmy, money } from "@/lib/utils";
export default function Financeiro() {
  const { data, add } = useStore(),
    { level } = useTenant();
  const [open, setOpen] = useState(false),
    [per, setPer] = useState("30"),
    [cat, setCat] = useState("all");
  const from = per === "all" ? "0000-00-00" : addDays(today(), -Number(per));
  const txs = data.txs
    .filter((t) => t.date >= from && (cat === "all" || t.category === cat))
    .sort((a, b) => b.date.localeCompare(a.date));
  const cats = Array.from(new Set(data.txs.map((t) => t.category)));
  const inn = txs
      .filter((t) => t.type === "in")
      .reduce((s, t) => s + t.amount, 0),
    out = txs.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0);
  return (
    <Page
      title="Financeiro"
      action="+ Lançamento"
      onAction={() => setOpen(true)}
    >
      <div className="flex flex-wrap gap-2">
        <select
          className="inp w-auto"
          value={per}
          onChange={(e) => setPer(e.target.value)}
          aria-label="Período"
        >
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="all">Tudo</option>
        </select>
        {level >= 1 && (
          <select
            className="inp w-auto"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            aria-label="Categoria"
          >
            <option value="all">Todas as categorias</option>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
        <Kpi label="Receita total" value={money(inn)} />
        <Kpi label="Despesas" value={money(out)} down />
        <Kpi label="Lucro líquido" value={money(inn - out)} />
      </div>
      {level >= 1 && (
        <Card title="Evolução financeira (7 dias)">
          <BarChart a={last7(data.txs, "in")} b={last7(data.txs, "out")} />
        </Card>
      )}
      <Card title="Lançamentos">
        <Table
          head={["Data", "Descrição", "Categoria", "Valor"]}
          empty="Sem lançamentos no período."
          rows={txs.map((t) => [
            dmy(t.date),
            t.desc,
            t.category,
            <span key="v" className={t.type === "in" ? "text-ok" : "text-bad"}>
              {t.type === "in" ? "+" : "−"} {money(t.amount)}
            </span>,
          ])}
        />
      </Card>
      {open && (
        <Modal title="Novo lançamento" onClose={() => setOpen(false)}>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              const f = formData(e);
              add("txs", {
                id: uid(),
                type: f.type as "in" | "out",
                category: f.category,
                desc: f.desc,
                amount: Number(f.amount),
                date: f.date,
              });
              setOpen(false);
            }}
          >
            <Field label="Tipo">
              <select name="type" className="inp">
                <option value="in">Entrada</option>
                <option value="out">Saída</option>
              </select>
            </Field>
            <Field label="Descrição">
              <input name="desc" required className="inp" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoria">
                <input
                  name="category"
                  required
                  defaultValue="Outros"
                  className="inp"
                />
              </Field>
              <Field label="Valor (R$)">
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  className="inp"
                />
              </Field>
            </div>
            <Field label="Data">
              <input
                name="date"
                type="date"
                required
                defaultValue={today()}
                className="inp"
              />
            </Field>
            <Actions onCancel={() => setOpen(false)} />
          </form>
        </Modal>
      )}
    </Page>
  );
}
