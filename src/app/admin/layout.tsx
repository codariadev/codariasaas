import type { Metadata } from "next";
import { ReactNode } from "react";
export const metadata: Metadata = {
  title: "Painel CodariaDev",
  robots: { index: false, follow: false },
};
export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
