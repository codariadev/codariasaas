"use client";
import { useState } from "react";
import { Actions, Field, Modal, formData } from "@/components/modal";
import { Card, Page, Table, Tag } from "@/components/ui";
import { uid, useStore } from "@/lib/store";
import { money } from "@/lib/utils";

export default function Servicos() {
  const { data, add, patch } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<(typeof data.services)[number] | null>(null);
  return (
    <Page
      title="Serviços"
      action="+ Novo serviço"
      onAction={() => setOpen(true)}
    >
      <Card>
        <Table
          head={["Serviço", "Categoria", "Duração", "Preço", "Status", ""]}
          rows={data.services.map((s) => [
            s.name,
            s.category,
            `${s.min} min`,
            money(s.price),
            <Tag key="t" tone={s.active ? "ok" : "bad"}>
              {s.active ? "Ativo" : "Inativo"}
            </Tag>,
            <button
              key="b"
              className="text-ac"
              onClick={() => patch("services", s.id, { active: !s.active })}
            >
              {s.active ? "Inativar" : "Ativar"}
            </button>,
            <button
              key="b"
              className="text-ac"
              onClick={() => setEditing(s)}
            >
              Editar
            </button>
          ])}
        />
      </Card>
      {open && (
        <Modal title="Novo serviço" onClose={() => setOpen(false)}>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              const f = formData(e);
              add("services", {
                id: uid(),
                name: f.name,
                category: f.category || "Geral",
                price: Number(f.price),
                min: Number(f.min),
                active: true,
              });
              setOpen(false);
            }}
          >
            <Field label="Nome">
              <input name="name" required className="inp" />
            </Field>
            <Field label="Categoria">
              <input name="category" className="inp" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço (R$)">
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="inp"
                />
              </Field>
              <Field label="Duração (min)">
                <input
                  name="min"
                  type="number"
                  min="5"
                  step="5"
                  required
                  defaultValue={30}
                  className="inp"
                />
              </Field>
            </div>
            <Actions onCancel={() => setOpen(false)} />
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Editar serviço" onClose={() => setEditing(null)}>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              const f = formData(e);

              patch("services", editing.id, {
                id: f.id,
                name: f.name,
                category: f.category || "Geral",
                price: Number(f.price),
                min: Number(f.min),
                active: true,
              });
              setEditing(null);
            }}
          >
            <Field label="Nome">
              <input 
                name="name"
                required
                className="inp"
                defaultValue={editing.name}
              />
            </Field>

            <Field label="Categoria">
              <input
                name="category"
                className="inp"
                defaultValue={editing.category}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço (R$)">
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="inp"
                  defaultValue={editing.price}
                />
              </Field>
              <Field label="Duração (min)">
                <input
                  name="min"
                  type="number"
                  min="5"
                  step="5"
                  required
                  defaultValue={editing.min}
                  className="inp"
                />
              </Field>
            </div>
            <Actions onCancel={() => setOpen(false)} />
          </form>
        </Modal>
      )}
    </Page>
  );
}
