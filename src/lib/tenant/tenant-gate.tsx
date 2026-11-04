"use client";
import { ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { TenantProvider } from "@/lib/tenant/tenant-config";
// A empresa vem da sessão (login no master). Remonta o provider quando a empresa muda (login/logout).
export default function TenantGate({ children }: { children: ReactNode }) {
  const { tenantCfg } = useAuth();
  return <TenantProvider key={tenantCfg?.tenantId ?? "none"} initial={tenantCfg}>{children}</TenantProvider>;
}
