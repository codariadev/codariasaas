"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { MODULES } from "@/config/modules";
import { ROLE_LABEL, canView } from "@/lib/permissions";
import { useAuth } from "@/lib/auth/auth-provider";
import { daysSince, useStore } from "@/lib/store";
import { PLANS, useTenant } from "@/lib/tenant/tenant-config";
export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname(),
    router = useRouter(),
    { tenant, seg, level } = useTenant();
  const { data, setQuery, saveError, clearError, notice, clearNotice } =
      useStore(),
    { user: auth, ready, logout } = useAuth();
  const [bell, setBell] = useState(false),
    [menu, setMenu] = useState(false),
    [q, setQ] = useState("");
  useEffect(() => {
    if (ready && !auth) router.replace("/login");
  }, [ready, auth, router]);
  if (!ready || !auth) return null;
  const items = MODULES.filter(
    (m) => m.level <= level && canView(auth.role, m.href),
  );
  const cur = MODULES.find((m) => m.href === path);
  const blocked = cur && (cur.level > level || !canView(auth.role, cur.href));
  const low = data.products.filter((p) => p.qty < p.min),
    idle = data.customers.filter((c) => daysSince(c.lastVisit) > 30);
  const search = (e: FormEvent) => {
    e.preventDefault();
    setQuery(q);
    router.push("/clientes");
  };
  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <aside className="fixed inset-x-0 bottom-0 z-10 flex gap-1 overflow-x-auto bg-side p-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] text-[#cfcbe8] md:sticky md:top-0 md:h-screen md:flex-col md:p-3">
        <div className="hidden items-center gap-2.5 px-2 pb-4 pt-1 font-bold text-white md:flex">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ac">
            {tenant.name[0]?.toUpperCase()}
          </span>
          {tenant.name}
        </div>
        {items.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className={`flex flex-col items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs md:flex-row md:text-sm ${path === m.href ? "bg-ac text-white" : "hover:bg-white/10"}`}
          >
            <span aria-hidden>{m.icon}</span>
            {m.label}
          </Link>
        ))}
      </aside>
      <main className="min-w-0 p-4 pb-28 md:p-6">
        <header className="relative mb-4 flex flex-wrap items-center gap-2 text-xs">
          <form onSubmit={search} className="min-w-[180px] flex-1">
            <input
              className="inp max-w-sm"
              placeholder="Buscar cliente…"
              aria-label="Busca contextual"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </form>
          <span className="rounded-full border border-bd bg-card px-3 py-1 text-mu">
            {seg.label} · {PLANS[tenant.plan].label}
          </span>
          <button
            aria-label="Notificações"
            onClick={() => {
              setBell(!bell);
              setMenu(false);
            }}
            className="relative rounded-full border border-bd bg-card px-3 py-1.5"
          >
            🔔
            {low.length + idle.length > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-bad px-1.5 text-[10px] text-white">
                {low.length + idle.length}
              </span>
            )}
          </button>
          <a
            aria-label="Ajuda"
            href="mailto:suporte@codariadev.com.br"
            className="rounded-full border border-bd bg-card px-3 py-1.5"
          >
            ?
          </a>
          <button
            onClick={() => {
              setMenu(!menu);
              setBell(false);
            }}
            className="flex items-center gap-2 rounded-full border border-bd bg-card py-1 pl-1 pr-3"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-soft font-bold text-ac">
              {auth.name[0]?.toUpperCase()}
            </span>
            {auth.name}
          </button>
          {bell && (
            <div className="absolute right-0 top-11 z-20 w-72 rounded-2xl border border-bd bg-card p-3 shadow-xl">
              {low.length + idle.length === 0 ? (
                <p className="text-mu">Sem alertas.</p>
              ) : (
                <>
                  {low.map((p) => (
                    <p key={p.id}>⚠ Repor: {p.name}</p>
                  ))}
                  {idle.length > 0 && (
                    <p>☺ {idle.length} cliente(s) inativo(s) há +30 dias</p>
                  )}
                </>
              )}
            </div>
          )}
          {menu && (
            <div className="absolute right-0 top-11 z-20 w-56 rounded-2xl border border-bd bg-card p-3 shadow-xl">
              <p className="mb-2 text-mu">{ROLE_LABEL[auth.role]}</p>
              <button
                className="btn w-full"
                onClick={async () => {
                  await logout();
                  router.replace("/login");
                }}
              >
                Sair
              </button>
            </div>
          )}
        </header>
        {notice && (
          <p
            role="status"
            onClick={clearNotice}
            className="mb-3 cursor-pointer break-all rounded-xl border border-ok bg-ok/10 p-3 text-sm"
          >
            {notice} (clique para fechar)
          </p>
        )}
        {saveError && (
          <p
            role="alert"
            onClick={clearError}
            className="mb-3 cursor-pointer rounded-xl border border-bad bg-bad/10 p-3 text-sm text-bad"
          >
            {saveError} (clique para fechar)
          </p>
        )}
        {blocked ? (
          <p className="rounded-2xl border border-dashed border-ac p-8 text-center text-mu">
            Este módulo não está disponível para o seu plano ou perfil de
            acesso.
          </p>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
