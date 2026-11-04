export type Status =
  | "agendado"
  | "confirmado"
  | "concluido"
  | "cancelado"
  | "faltou"
  | "bloqueio";
export const STATUS_LABEL: Record<Status, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
  faltou: "Não compareceu",
  bloqueio: "Bloqueio",
};
export type Role =
  | "owner"
  | "admin"
  | "manager"
  | "professional"
  | "receptionist";
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  lastVisit: string;
}
export interface Service {
  id: string;
  name: string;
  price: number;
  min: number;
  category: string;
  active: boolean;
}
export interface Professional {
  id: string;
  name: string;
  rate: number;
  active: boolean;
}
export interface Appointment {
  id: string;
  customerId: string;
  professionalId: string;
  serviceId: string;
  date: string;
  start: number;
  min: number;
  price: number;
  status: Status;
}
export interface Tx {
  id: string;
  type: "in" | "out";
  category: string;
  desc: string;
  amount: number;
  date: string;
  appointmentId?: string;
}
export interface Product {
  id: string;
  name: string;
  qty: number;
  min: number;
  price: number;
}
export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}
export interface Campaign {
  id: string;
  name: string;
  active: boolean;
}
export type PlanId = "essencial" | "profissional" | "premium";
export type SegmentIdT = "barbearia" | "salao" | "estetica";
export interface PublicTenantConfig {
  tenantId: string;
  slug: string;
  name: string;
  segment: SegmentIdT;
  plan: PlanId;
  accent: string;
  status: "active" | "suspended";
  mode: "firebase" | "demo";
  firebase?: Record<string, string>; // config WEB do Firebase: pública por design
}
