"use client";
import type { Auth } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { Field, Modal } from "@/components/modal";
import { Card, Table, Tag } from "@/components/ui";
// Painel interno da CodariaDev (/admin). Compartilha a sessão do master: quem já entrou em /login como administrador chega direto.
const MASTER: Record<string, string> | null = (() => {
  try {
    const j = JSON.parse(process.env.NEXT_PUBLIC_MASTER_FIREBASE ?? "");
    return j?.apiKey ? j : null;
  } catch {
    return null;
  }
})();
type Row = {
  id: string;
  name: string;
  segment: string;
  plan: string;
  status: string;
  members: number;
  owner: string | null;
};
type Check = {
  name: string;
  status: "ok" | "warn" | "fail";
  msg: string;
  forceable?: boolean;
};
const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
// Aceita JSON ou o trecho "const firebaseConfig = {...}" copiado do console do Firebase.
function parseWeb(t: string): Record<string, string> | null {
  try {
    const j = JSON.parse(t);
    if (j?.apiKey) return j;
  } catch {}
  const o: Record<string, string> = {};
  for (const m of t.matchAll(/["']?(\w+)["']?\s*:\s*["']([^"']*)["']/g))
    o[m[1]] = m[2];
  return o.apiKey && o.projectId ? o : null;
}
const saId = (t: string) => {
  try {
    return JSON.parse(t)?.type === "service_account"
      ? (JSON.parse(t).project_id as string)
      : null;
  } catch {
    return null;
  }
};
const Checks = ({ cs }: { cs: Check[] }) => (
  <ul className="space-y-1 text-sm">
    {cs.map((c, i) => (
      <li key={i}>
        <Tag
          tone={c.status === "ok" ? "ok" : c.status === "warn" ? "warn" : "bad"}
        >
          {c.status === "ok" ? "OK" : c.status === "warn" ? "Atenção" : "Falha"}
        </Tag>{" "}
        <b>{c.name}:</b> {c.msg}
      </li>
    ))}
  </ul>
);
const copy = (t: string) => navigator.clipboard?.writeText(t);
const readFile = (f: File | undefined, set: (s: string) => void) => {
  if (f) f.text().then(set);
};
const SEG: Record<string, string> = {
  barbearia: "Barbearia",
  salao: "Salão",
  estetica: "Estética",
};
const PL: Record<string, string> = {
  essencial: "Essencial",
  profissional: "Profissional",
  premium: "Premium",
};

export default function AdminPage() {
  const [auth, setAuth] = useState<Auth | null>(null),
    [fa, setFa] = useState<typeof import("firebase/auth") | null>(null);
  const [email, setEmail] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [err, setErr] = useState(""),
    [tab, setTab] = useState<"list" | "new" | "guide">("list");
  const [rows, setRows] = useState<Row[]>([]),
    [modal, setModal] = useState<{
      title: string;
      body: React.ReactNode;
    } | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!MASTER) {
      setReady(true);
      return;
    }
    let off = () => {};
    Promise.all([
      import("@/lib/firebase/client"),
      import("firebase/auth"),
    ]).then(([c, a]) => {
      const { auth: au } = c.getTenantFirebase("master", MASTER);
      setAuth(au);
      setFa(a);
      off = a.onAuthStateChanged(au, (u) => {
        setEmail(u?.email ?? null);
        setReady(true);
      });
    });
    return () => off();
  }, []);
  const api = useCallback(
    async (path: string, method = "GET", body?: unknown) => {
      const r = await fetch(path, {
        method,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${await auth?.currentUser?.getIdToken()}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await r.text();
      let j: Record<string, any> = {};
      try {
        j = JSON.parse(text);
      } catch {} // eslint-disable-line @typescript-eslint/no-explicit-any
      return { ok: r.ok, status: r.status, j, text }; // eslint-disable-line @typescript-eslint/no-explicit-any
    },
    [auth],
  );
  const refresh = useCallback(async () => {
    const r = await api("/api/admin/tenants");
    if (r.status === 401 || r.status === 403) {
      setErr("Este usuário não tem permissão de administrador.");
      await fa?.signOut(auth!);
      return;
    }
    setRows(r.j.tenants ?? []);
  }, [api, fa, auth]);
  useEffect(() => {
    if (email) void refresh();
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (
    id: string,
    body: object,
    title: string,
    show?: (j: Record<string, any>) => React.ReactNode,
  ) => {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    setBusy(true);
    const r = await api(`/api/admin/tenants/${id}`, "PATCH", body);
    setBusy(false);
    if (r.j.checks) setModal({ title, body: <Checks cs={r.j.checks} /> });
    else if (!r.ok)
      setModal({
        title,
        body: (
          <p className="text-bad">
            Não foi possível concluir ({String(r.j.error ?? r.status)}).
          </p>
        ),
      });
    else if (show) setModal({ title, body: show(r.j) });
    void refresh();
  };
  const linkBox = (l: string) => (
    <div className="space-y-2">
      <p className="text-sm text-mu">
        Envie este link ao dono para definir a senha (uso único):
      </p>
      <p className="break-all rounded-xl bg-bg p-3 text-xs">{l}</p>
      <button className="btn" onClick={() => copy(l)}>
        Copiar link
      </button>
    </div>
  );

  if (!ready) return null;
  if (!MASTER)
    return (
      <main className="p-8">
        Configure NEXT_PUBLIC_MASTER_FIREBASE para usar o painel.
      </main>
    );
  if (!email)
    return (
      <main className="grid min-h-screen place-items-center p-4">
        <form
          className="w-full max-w-sm space-y-4 rounded-2xl border border-bd bg-card p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setErr("");
            try {
              await fa!.signInWithEmailAndPassword(
                auth!,
                String(f.get("e")),
                String(f.get("p")),
              );
            } catch {
              setErr("E-mail ou senha incorretos.");
            }
          }}
        >
          <h1 className="text-xl font-bold">Painel CodariaDev</h1>
          <Field label="E-mail">
            <input
              name="e"
              type="email"
              required
              className="inp"
              autoComplete="username"
            />
          </Field>
          <Field label="Senha">
            <input
              name="p"
              type="password"
              required
              className="inp"
              autoComplete="current-password"
            />
          </Field>
          {err && (
            <p role="alert" className="text-sm text-bad">
              {err}
            </p>
          )}
          <button className="btn w-full">Entrar</button>
        </form>
      </main>
    );
  return (
    <main className="mx-auto max-w-3/4 space-y-4 p-4 md:p-8">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">Painel CodariaDev</h1>
        <span className="text-sm text-mu">{email}</span>
        <button
          className="rounded-xl border border-bd px-3 py-1.5"
          onClick={() => fa!.signOut(auth!)}
        >
          Sair
        </button>
      </header>
      <div className="flex gap-2">
        {(
          [
            ["list", "Empresas"],
            ["new", "Nova empresa"],
            ["guide", "Guia do cliente"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-xl border px-4 py-2 ${tab === k ? "border-ac bg-soft font-semibold text-ac" : "border-bd bg-card"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "list" && (
        <Card>
          <Table
            empty="Nenhuma empresa cadastrada. Use “Nova empresa”."
            head={[
              "Empresa",
              "Segmento",
              "Plano",
              "Dono",
              "Usuários",
              "Status",
              "Ações",
            ]}
            rows={rows.map((r) => [
              <span key="n">
                <b>{r.name}</b>
                <br />
                <small className="text-mu">{r.id}</small>
              </span>,
              SEG[r.segment] ?? r.segment,
              <select
                key="p"
                aria-label={`Plano de ${r.name}`}
                className="inp w-32 py-1"
                value={r.plan}
                onChange={(e) =>
                  act(r.id, { action: "update", plan: e.target.value }, "Plano")
                }
              >
                {Object.entries(PL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>,
              r.owner ?? "—",
              r.members,
              <Tag key="s" tone={r.status === "active" ? "ok" : "bad"}>
                {r.status === "active" ? "Ativa" : "Suspensa"}
              </Tag>,
              <span key="a" className="flex gap-3 text-sm text-ac">
                <button
                  disabled={busy}
                  onClick={() =>
                    act(r.id, { action: "test" }, "Teste de conexão")
                  }
                >
                  Testar
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    act(r.id, { action: "owner_link" }, "Link do dono", (j) =>
                      linkBox(j.resetLink),
                    )
                  }
                >
                  Link do dono
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    setModal({
                      title: `Trocar chave · ${r.name}`,
                      body: (
                        <KeyForm
                          onSubmit={(sa) => {
                            setModal(null);
                            void act(
                              r.id,
                              { action: "rotate_key", sa },
                              "Troca de chave",
                              () => (
                                <p className="text-ok">Chave atualizada.</p>
                              ),
                            );
                          }}
                        />
                      ),
                    })
                  }
                >
                  Trocar chave
                </button>
                <button
                  disabled={busy}
                  className={r.status === "active" ? "text-bad" : ""}
                  onClick={() => {
                    if (
                      confirm(
                        r.status === "active"
                          ? `Suspender ${r.name}? Todos serão desconectados.`
                          : `Reativar ${r.name}?`,
                      )
                    )
                      void act(
                        r.id,
                        {
                          action: "status",
                          status:
                            r.status === "active" ? "suspended" : "active",
                        },
                        "Status",
                        () => <p>Status atualizado.</p>,
                      );
                  }}
                >
                  {r.status === "active" ? "Suspender" : "Reativar"}
                </button>
              </span>,
            ])}
          />
        </Card>
      )}
      {tab === "new" && (
        <NewTenant
          api={api}
          linkBox={linkBox}
          onDone={() => {
            void refresh();
          }}
        />
      )}
      {tab === "guide" && <Guide api={api} />}
      {modal && (
        <Modal title={modal.title} onClose={() => setModal(null)}>
          {modal.body}
        </Modal>
      )}
    </main>
  );
}
function KeyForm({ onSubmit }: { onSubmit: (sa: string) => void }) {
  const [sa, setSa] = useState("");
  return (
    <div className="space-y-3">
      <Field label="Nova chave de serviço (JSON)">
        <input
          type="file"
          accept="application/json"
          onChange={(e) => readFile(e.target.files?.[0], setSa)}
        />
      </Field>
      {sa && (
        <p className="text-sm">
          {saId(sa) ? `✓ Chave do projeto ${saId(sa)}` : "Arquivo inválido."}
        </p>
      )}
      <button className="btn" disabled={!saId(sa)} onClick={() => onSubmit(sa)}>
        Validar e trocar
      </button>
    </div>
  );
}
type Api = (
  p: string,
  m?: string,
  b?: unknown,
) => Promise<{
  ok: boolean;
  status: number;
  j: Record<string, any>;
  text: string;
}>; // eslint-disable-line @typescript-eslint/no-explicit-any
function NewTenant({
  api,
  linkBox,
  onDone,
}: {
  api: Api;
  linkBox: (l: string) => React.ReactNode;
  onDone: () => void;
}) {
  const [f, setF] = useState({
      name: "",
      id: "",
      segment: "barbearia",
      plan: "essencial",
      accent: "#7c4dff",
      ownerName: "",
      ownerEmail: "",
      web: "",
      sa: "",
    }),
    [idEdited, setIdEdited] = useState(false);
  const [checks, setChecks] = useState<Check[] | null>(null),
    [force, setForce] = useState(false),
    [msg, setMsg] = useState(""),
    [done, setDone] = useState<{ link: string; id: string } | null>(null),
    [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) =>
    setF((s) => ({
      ...s,
      [k]: v,
      ...(k === "name" && !idEdited ? { id: slug(v) } : {}),
    }));
  const web = parseWeb(f.web),
    body = { ...f, web, sa: f.sa || undefined, force };
  const ready = f.name && f.id.length > 1 && f.ownerName && f.ownerEmail && web;
  const run = async (dry: boolean) => {
    setBusy(true);
    setMsg("");
    const r = await api("/api/admin/tenants", "POST", { ...body, dryRun: dry });
    setBusy(false);
    setChecks(r.j.checks ?? null);
    if (r.status === 409)
      setMsg(
        r.j.error === "id_em_uso"
          ? "Já existe uma empresa com este identificador."
          : "Este e-mail já está vinculado a uma empresa.",
      );
    else if (r.status === 400)
      setMsg(
        "Confira os campos: config web, chave de serviço, identificador e e-mail.",
      );
    else if (!dry && r.ok) {
      setDone({ link: r.j.resetLink, id: r.j.id });
      setF((s) => ({ ...s, sa: "" }));
      onDone();
    }
  };
  if (done)
    return (
      <Card title="Empresa cadastrada ✓">
        <div className="space-y-3">
          <p>
            O dono acessa{" "}
            <b>
              {typeof location !== "undefined" ? location.origin : ""}/login
            </b>{" "}
            com o e-mail <b>{f.ownerEmail}</b>.
          </p>
          {linkBox(done.link)}
          <p className="text-sm text-mu">
            Apague o arquivo da chave de serviço do seu computador.
          </p>
        </div>
      </Card>
    );
  return (
    <Card title="Cadastrar nova empresa">
      <div className="space-y-5">
        <section className="grid gap-3 md:grid-cols-2">
          <h3 className="font-semibold md:col-span-2">1. Negócio</h3>
          <Field label="Nome">
            <input
              className="inp"
              value={f.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Barbearia Alpha"
            />
          </Field>
          <Field label="Identificador (minúsculas, sem espaço)">
            <input
              className="inp"
              value={f.id}
              onChange={(e) => {
                setIdEdited(true);
                set("id", slug(e.target.value));
              }}
            />
          </Field>
          <Field label="Segmento">
            <select
              className="inp"
              value={f.segment}
              onChange={(e) => set("segment", e.target.value)}
            >
              {Object.entries(SEG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plano">
            <select
              className="inp"
              value={f.plan}
              onChange={(e) => set("plan", e.target.value)}
            >
              {Object.entries(PL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cor principal">
            <input
              type="color"
              className="inp h-10 p-1"
              value={f.accent}
              onChange={(e) => set("accent", e.target.value)}
            />
          </Field>
        </section>
        <section className="grid gap-3 md:grid-cols-2">
          <h3 className="font-semibold md:col-span-2">2. Dono</h3>
          <Field label="Nome do dono">
            <input
              className="inp"
              value={f.ownerName}
              onChange={(e) => set("ownerName", e.target.value)}
            />
          </Field>
          <Field label="E-mail do dono">
            <input
              type="email"
              className="inp"
              value={f.ownerEmail}
              onChange={(e) => set("ownerEmail", e.target.value)}
            />
          </Field>
        </section>
        <section className="space-y-3">
          <h3 className="font-semibold">3. Firebase do cliente</h3>
          <Field label="Config web (cole o trecho do console ou o JSON)">
            <textarea
              rows={5}
              className="inp font-mono text-xs"
              value={f.web}
              onChange={(e) => set("web", e.target.value)}
              placeholder={
                'const firebaseConfig = {\n  apiKey: "...", projectId: "...", appId: "..."\n};'
              }
            />
          </Field>
          <p className="text-sm">
            {f.web
              ? web
                ? `✓ Projeto detectado: ${web.projectId}`
                : "Não foi possível ler a config (precisa de apiKey e projectId)."
              : ""}
          </p>
          <Field label="Chave de serviço (arquivo JSON)">
            <input
              type="file"
              accept="application/json"
              onChange={(e) =>
                readFile(e.target.files?.[0], (s) => set("sa", s))
              }
            />
          </Field>
          <p className="text-sm">
            {f.sa
              ? saId(f.sa)
                ? `✓ Chave carregada (projeto ${saId(f.sa)})`
                : "Arquivo não é uma chave de serviço válida."
              : ""}
          </p>
        </section>
        {checks && (
          <div className="rounded-xl border border-bd p-3">
            <Checks cs={checks} />
            {checks.some((c) => c.forceable && c.status === "fail") && (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                />
                Cadastrar mesmo com as regras abertas (vou publicá-las em
                seguida)
              </label>
            )}
          </div>
        )}
        {msg && (
          <p role="alert" className="text-sm text-bad">
            {msg}
          </p>
        )}
        <div className="flex gap-2">
          <button
            className="rounded-xl border border-bd px-4 py-2 disabled:opacity-50"
            disabled={!ready || busy}
            onClick={() => run(true)}
          >
            Verificar conexão
          </button>
          <button
            className="btn disabled:opacity-50"
            disabled={!ready || busy}
            onClick={() => run(false)}
          >
            {busy ? "Processando…" : "Cadastrar empresa"}
          </button>
        </div>
      </div>
    </Card>
  );
}
function Guide({ api }: { api: Api }) {
  const [m, setM] = useState("");
  const get = async (file: string, label: string) => {
    const r = await api(`/api/admin/rules?file=${file}`);
    if (r.ok) {
      copy(r.text);
      setM(`${label} copiado ✓`);
    } else setM("Não foi possível copiar.");
  };
  const steps = [
    "O cliente cria o projeto no Firebase (conta Google dele; ele continua Owner) e concede a você o acesso necessário.",
    "Authentication → Começar. Firestore Database → Criar banco (modo produção, região São Paulo).",
    "Configurações do projeto → Seus apps → Web (</>) → copie o firebaseConfig.",
    "IAM e administrador → Contas de serviço → criar conta (ex.: codaria-sessoes) SOMENTE com o papel “Administrador do Firebase Authentication” → Chaves → Adicionar chave (JSON).",
    "Firestore → Regras: cole as regras abaixo e publique (o painel recusa regras abertas). Faça o mesmo no Storage, se usado.",
    "Aqui, em “Nova empresa”: cole a config web, envie a chave, verifique e cadastre. Envie o link de senha ao dono e apague a chave do seu computador.",
  ];
  return (
    <Card title="Passo a passo para cada cliente">
      <ol className="list-decimal space-y-2 pl-5">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="btn"
          onClick={() => get("firestore", "Regras do Firestore")}
        >
          Copiar regras do Firestore
        </button>
        <button
          className="rounded-xl border border-bd px-4 py-2"
          onClick={() => get("storage", "Regras do Storage")}
        >
          Copiar regras do Storage
        </button>
        <button
          className="rounded-xl border border-bd px-4 py-2"
          onClick={() => get("indexes", "Índices")}
        >
          Copiar índices
        </button>
      </div>
      {m && <p className="mt-2 text-sm text-ok">{m}</p>}
    </Card>
  );
}
