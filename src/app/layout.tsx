import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { StoreProvider } from "@/lib/store";
import TenantGate from "@/lib/tenant/tenant-gate";
export const metadata: Metadata = { title: "CodariaDev · Gestão" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <TenantGate>
            <StoreProvider>{children}</StoreProvider>
          </TenantGate>
        </AuthProvider>
      </body>
    </html>
  );
}
