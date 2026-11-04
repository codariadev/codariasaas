"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Field, formData } from "@/components/modal";
import { useAuth } from "@/lib/auth/auth-provider";
import { ROLE_LABEL } from "@/lib/permissions";
import { Role } from "@/types";
export default function Login() {
  const { user, isAdmin, ready, mode, login } = useAuth(),
    router = useRouter();
  const [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (ready && isAdmin) router.replace("/admin");
    else if (ready && user) router.replace("/dashboard");
  }, [ready, user, isAdmin, router]);
  return (
    <form
      onSubmit={async (e) => {
        const f = formData(e);
        setBusy(true);
        setErr("");
        const m = await login(
          f.email.trim(),
          f.password,
          f.role as Role | undefined,
        );
        setBusy(false);
        if (m === "__admin__") router.replace("/admin");
        else if (m) setErr(m);
        else router.replace("/dashboard");
      }}
      className="w-full max-w-sm space-y-4 rounded-2xl border border-bd bg-card p-6"
    >
      <div>
        <h1 className="text-xl font-bold">CodariaSaas</h1>
        <small className="text-mu">
          Sistema de gestão para seu negócio.
        </small>
      </div>
      <Field label="E-mail">
        <input
          name="email"
          type="email"
          required
          className="inp"
          autoComplete="username"
        />
      </Field>
      <Field label="Senha">
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="inp"
          autoComplete="current-password"
        />
      </Field>
      {mode === "demo" && (
        <Field label="Perfil (demonstração)">
          <select name="role" className="inp" defaultValue="owner">
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>
      )}
      {err && (
        <p role="alert" className="text-sm text-bad">
          {err}
        </p>
      )}
      <button className="btn w-full disabled:opacity-60" disabled={busy}>
        {busy ? "Entrando…" : "Entrar"}
      </button>
      <Link
        href="/recuperar-senha"
        className="block text-center text-sm text-ac"
      >
        Esqueci minha senha
      </Link>
      {mode === "demo" && (
        <p className="rounded-xl bg-warn/10 p-2 text-xs text-mu">
          Modo demonstração: Firebase master não configurado (veja
          .env.example).
        </p>
      )}
    </form>
  );
}
