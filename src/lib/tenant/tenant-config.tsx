"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { SEGMENTS, Segment, SegmentId } from "@/config/segments";
import type { PlanId, PublicTenantConfig } from "@/types";
export type { PlanId };
export const PLANS: Record<PlanId, { label: string; level: number }> = {
  essencial: { label: "Essencial", level: 0 },
  profissional: { label: "Profissional", level: 1 },
  premium: { label: "Premium", level: 2 },
};
export interface TenantConfig {
  segment: SegmentId;
  plan: PlanId;
  name: string;
  accent: string;
  theme: "auto" | "light" | "dark";
}
interface Ctx {
  tenant: TenantConfig;
  tenantId: string | null;
  mode: "firebase" | "demo";
  firebase?: Record<string, string>;
  seg: Segment;
  level: number;
  update: (p: Partial<TenantConfig>) => void;
}
const Context = createContext<Ctx>(null as unknown as Ctx);
export const useTenant = () => useContext(Context);
export function TenantProvider({
  initial,
  children,
}: {
  initial: PublicTenantConfig | null;
  children: ReactNode;
}) {
  const mode = initial?.mode ?? "demo",
    key = "tenant:" + (initial?.tenantId ?? "none");
  const [tenant, setTenant] = useState<TenantConfig>({
    segment: initial?.segment ?? "barbearia",
    plan: initial?.plan ?? "premium",
    name: initial?.name ?? "Nome da empresa",
    accent: initial?.accent ?? SEGMENTS.barbearia.accent,
    theme: "dark",
  });
  useEffect(() => {
    try {
      const o = JSON.parse(localStorage.getItem(key) ?? "null");
      if (o)
        setTenant((t) => ({
          ...t,
          name: o.name ?? t.name,
          accent: o.accent ?? t.accent,
          theme: o.theme ?? t.theme,
          ...(mode === "demo"
            ? { plan: o.plan ?? t.plan, segment: o.segment ?? t.segment }
            : {}),
        }));
    } catch {}
  }, [key, mode]);
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--ac", tenant.accent);
    if (tenant.theme === "auto") r.removeAttribute("data-theme");
    else r.setAttribute("data-theme", tenant.theme);
  }, [tenant.accent, tenant.theme]);
  const update = (p: Partial<TenantConfig>) =>
    setTenant((t) => {
      const n = { ...t, ...p };
      try {
        localStorage.setItem(key, JSON.stringify(n));
      } catch {}
      return n;
    });
  return (
    <Context.Provider
      value={{
        tenant,
        tenantId: initial?.tenantId ?? null,
        mode,
        firebase: initial?.firebase,
        seg: SEGMENTS[tenant.segment],
        level: PLANS[tenant.plan].level,
        update,
      }}
    >
      {children}
    </Context.Provider>
  );
}
