
"use client";
import { useState } from "react";
import { Actions, Field, Modal, formData } from "@/components/modal";
import { Card, Page, Tag } from "@/components/ui";
import { uid, useStore } from "@/lib/store";
import { useTenant } from "@/lib/tenant/tenant-config";

export default function Profissionais() {
  const { data, add, patch } = useStore();
  const { seg, level } = useTenant();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<
    (typeof data.professionals)[number] | null
  >(null);

  return (
    <Page
      title="Profissionais"
      action="+ Novo profissional"
      onAction={() => setOpen(true)}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
        {data.professionals.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-soft font-bold text-ac">
                {p.name[0]}
              </span>

              <div>
                <b>{p.name}</b>
                <br />
                <small className="text-mu">{seg.label}</small>
              </div>
            </div>

            <p className="mt-3">
              {level > 0 && (
                <>
                  Comissão: <b>{p.rate}%</b>
                  <br />
                </>
              )}

              <Tag tone={p.active ? "ok" : "bad"}>
                {p.active ? "Ativo" : "Inativo"}
              </Tag>
            </p>

            <div className="mt-3 flex items-center gap-4">
              <button
                className="text-sm text-ac"
                onClick={() => setEditing(p)}
              >
                Editar
              </button>

              <button
                className="text-sm text-ac"
                onClick={() =>
                  patch("professionals", p.id, {
                    active: !p.active,
                  })
                }
              >
                {p.active ? "Inativar" : "Ativar"}
              </button>
            </div>
          </Card>
        ))}
      </div>

      {open && (
        <Modal
          title="Novo profissional"
          onClose={() => setOpen(false)}
        >
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = formData(e);

              add("professionals", {
                id: uid(),
                name: f.name,
                rate: Number(f.rate || 0),
                active: true,
              });

              setOpen(false);
            }}
          >
            <Field label="Nome">
              <input name="name" required className="inp" />
            </Field>

            {level > 0 && (
              <Field label="Comissão (%)">
                <input
                  name="rate"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={40}
                  className="inp"
                />
              </Field>
            )}

            <Actions onCancel={() => setOpen(false)} />
          </form>
        </Modal>
      )}

      {editing && (
        <Modal
          title="Editar profissional"
          onClose={() => setEditing(null)}
        >
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = formData(e);

              patch("professionals", editing.id, {
                name: f.name,
                ...(level > 0
                  ? { rate: Number(f.rate || 0) }
                  : {}),
              });

              setEditing(null);
            }}
          >
            <Field label="Nome">
              <input
                name="name"
                required
                defaultValue={editing.name}
                className="inp"
              />
            </Field>

            {level > 0 && (
              <Field label="Comissão (%)">
                <input
                  name="rate"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={editing.rate}
                  className="inp"
                />
              </Field>
            )}

            <Actions onCancel={() => setEditing(null)} />
          </form>
        </Modal>
      )}
    </Page>
  );
}
