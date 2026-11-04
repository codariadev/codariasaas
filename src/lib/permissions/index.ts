import { Role } from "@/types";
// Apenas conveniência de interface. A autorização real fica nas Security Rules (firebase/*.rules).
const ALL = ["/dashboard", "/agenda", "/clientes", "/servicos", "/profissionais", "/financeiro", "/estoque", "/comissoes", "/relatorios", "/marketing", "/configuracoes"];
export const ROLE_MODULES: Record<Role, string[]> = {
  owner: ALL, admin: ALL, manager: ALL.filter((h) => h !== "/configuracoes"),
  receptionist: ["/dashboard", "/agenda", "/clientes", "/servicos"], professional: ["/dashboard", "/agenda", "/clientes"],
};
export const ROLE_LABEL: Record<Role, string> = { owner: "Proprietário", admin: "Administrador", manager: "Gerente", professional: "Profissional", receptionist: "Recepção" };
export const canView = (r: Role, href: string) => ROLE_MODULES[r].includes(href);
