"use client";
import { FormEvent, useState } from "react";
import { Actions, Field, Modal, formData } from "@/components/modal";
import { Page } from "@/components/ui";
import { useAuth } from "@/lib/auth/auth-provider";
import { addDays, hh, today, uid, useStore } from "@/lib/store";
import { STATUS_LABEL, Status } from "@/types";
type M = { kind: "new" | "block" } | { kind: "edit"; id: string } | null;
const COLOR: Record<Status, string> = {
  agendado: "border-warn bg-warn/15",
  confirmado: "border-ac bg-soft",
  concluido: "border-ok bg-ok/15",
  cancelado: "",
  faltou: "border-bad bg-bad/15",
  bloqueio: "border-mu bg-bd",
};
export default function Agenda() {
  const { data, add, patch } = useStore(),
    { user: auth } = useAuth();
  const [date, setDate] = useState(today()),
    [pf, setPf] = useState("all"),
    [m, setM] = useState<M>(null),
    [err, setErr] = useState("");
  const pros = data.professionals.filter(
    (p) =>
      p.active &&
      (pf === "all" || p.id === pf) &&
      (auth?.role !== "professional" || p.id === data.professionals[0]?.id),
  );
  const day = data.appointments.filter(
    (a) => a.date === date && a.status !== "cancelado",
  );
  const cn = (id: string) =>
      data.customers.find((c) => c.id === id)?.name ?? "—",
    sn = (id: string) => data.services.find((s) => s.id === id)?.name ?? "—";
  const close = () => {
    setM(null);
    setErr("");
  };
  const save = (e: FormEvent<HTMLFormElement>, block: boolean) => {
    const f = formData(e),
      [h, mi] = f.time.split(":").map(Number),
      start = h + mi / 60;
    const sv = data.services.find((s) => s.id === f.serviceId),
      min = block ? Number(f.min) : (sv?.min ?? 30);
    if (
      data.appointments.some(
        (a) =>
          a.professionalId === f.professionalId &&
          a.date === f.date &&
          a.status !== "cancelado" &&
          start < a.start + a.min / 60 &&
          a.start < start + min / 60,
      )
    )
      return setErr(
        "Conflito de horário com outro agendamento ou bloqueio deste profissional.",
      );
    add("appointments", {
      id: uid(),
      customerId: block ? "" : f.customerId,
      professionalId: f.professionalId,
      serviceId: block ? "" : f.serviceId,
      date: f.date,
      start,
      min,
      price: block ? 0 : (sv?.price ?? 0),
      status: block ? "bloqueio" : "agendado",
    });
    setDate(f.date);
    close();
  };
  const form = (block: boolean) => (
    <form onSubmit={(e) => save(e, block)} className="grid gap-3">
      {!block && (
        <Field label="Cliente">
          <select name="customerId" required className="inp">
            {data.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {!block && (
        <Field label="Serviço">
          <select name="serviceId" required className="inp">
            {data.services
              .filter((s) => s.active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.min} min
                </option>
              ))}
          </select>
        </Field>
      )}
      <Field label="Profissional">
        <select name="professionalId" required className="inp">
          {data.professionals
            .filter((p) => p.active)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data">
          <input
            name="date"
            type="date"
            required
            defaultValue={date}
            className="inp"
          />
        </Field>
        <Field label="Horário">
          <input
            name="time"
            type="time"
            required
            defaultValue="09:00"
            className="inp"
          />
        </Field>
      </div>
      {block && (
        <Field label="Duração">
          <select name="min" className="inp">
            <option value="30">30 min</option>
            <option value="60">1 hora</option>
            <option value="120">2 horas</option>
            <option value="240">4 horas</option>
          </select>
        </Field>
      )}
      {err && (
        <p role="alert" className="text-sm text-bad">
          {err}
        </p>
      )}
      <Actions onCancel={close} />
    </form>
  );
  const ed =
    m?.kind === "edit"
      ? data.appointments.find((a) => a.id === m.id)
      : undefined;
  return (
    <Page
      title="Agenda"
      action="+ Novo agendamento"
      onAction={() => setM({ kind: "new" })}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded-xl border border-bd bg-card px-3 py-2"
          onClick={() => setDate(addDays(date, -1))}
          aria-label="Dia anterior"
        >
          ‹
        </button>
        <input
          type="date"
          className="inp w-auto"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Data"
        />
        <button
          className="rounded-xl border border-bd bg-card px-3 py-2"
          onClick={() => setDate(addDays(date, 1))}
          aria-label="Próximo dia"
        >
          ›
        </button>
        <button
          className="rounded-xl border border-bd bg-card px-3 py-2"
          onClick={() => setDate(today())}
        >
          Hoje
        </button>
        <select
          className="inp w-auto"
          value={pf}
          onChange={(e) => setPf(e.target.value)}
          aria-label="Filtrar profissional"
        >
          <option value="all">Todos os profissionais</option>
          {data.professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          className="rounded-xl bg-soft px-3 py-2 font-semibold text-ac"
          onClick={() => setM({ kind: "block" })}
        >
          Bloquear horário
        </button>
      </div>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[620px] overflow-hidden rounded-2xl border border-bd bg-card"
          style={{
            gridTemplateColumns: `54px repeat(${Math.max(pros.length, 1)},1fr)`,
          }}
        >
          <div>
            <div className="h-10 border-b border-bd" />
            {Array.from({ length: 15 }, (_, i) => (
              <div key={i} className="h-[52px] px-1.5 text-[11px] text-mu">
                {String(8 + i).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {pros.map((p) => (
            <div key={p.id} className="border-l border-bd">
              <div className="h-10 border-b border-bd bg-bg p-2.5 font-semibold">
                {p.name}
              </div>
              <div
                className="relative h-[520px]"
                style={{
                  background:
                    "repeating-linear-gradient(var(--card) 0 51px,var(--bd) 51px 52px)",
                }}
              >
                {day
                  .filter((a) => a.professionalId === p.id && a.start >= 8)
                  .map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setM({ kind: "edit", id: a.id })}
                      className={`absolute inset-x-1 overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left text-xs ${COLOR[a.status]}`}
                      style={{
                        top: (a.start - 8) * 52,
                        height: (a.min / 60) * 52 - 3,
                      }}
                    >
                      <b>
                        {a.status === "bloqueio"
                          ? "Bloqueado"
                          : cn(a.customerId)}
                      </b>
                      <br />
                      {a.status === "bloqueio"
                        ? hh(a.start)
                        : `${hh(a.start)} · ${sn(a.serviceId)}`}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {m?.kind === "new" && (
        <Modal title="Novo agendamento" onClose={close}>
          {form(false)}
        </Modal>
      )}
      {m?.kind === "block" && (
        <Modal title="Bloquear horário" onClose={close}>
          {form(true)}
        </Modal>
      )}
      {ed && (
        <Modal
          title={ed.status === "bloqueio" ? "Bloqueio" : cn(ed.customerId)}
          onClose={close}
        >
          <p className="mb-3 text-sm text-mu">
            {ed.status !== "bloqueio" && <>{sn(ed.serviceId)} · </>}
            {hh(ed.start)} · {ed.min} min ·{" "}
            {data.professionals.find((p) => p.id === ed.professionalId)?.name}
          </p>
          {ed.status !== "bloqueio" && (
            <Field label="Status">
              <select
                className="inp"
                value={ed.status}
                onChange={(e) =>
                  patch("appointments", ed.id, {
                    status: e.target.value as Status,
                  })
                }
              >
                {(
                  ["agendado", "confirmado", "concluido", "faltou"] as Status[]
                ).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              className="rounded-xl border border-bad px-4 py-2 text-bad"
              onClick={() => {
                patch("appointments", ed.id, { status: "cancelado" });
                close();
              }}
            >
              {ed.status === "bloqueio"
                ? "Remover bloqueio"
                : "Cancelar agendamento"}
            </button>
            <button className="btn" onClick={close}>
              Fechar
            </button>
          </div>
        </Modal>
      )}
    </Page>
  );
}
