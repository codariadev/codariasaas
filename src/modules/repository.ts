import type * as FS from "firebase/firestore";
import { Role } from "@/types";
// Mapeia o modelo da interface para o modelo Firestore do PDF (seção 7) e vice-versa.
export type CKey =
  | "customers"
  | "services"
  | "professionals"
  | "appointments"
  | "txs"
  | "products"
  | "campaigns";
export const COLL: Record<CKey, string> = {
  customers: "customers",
  services: "services",
  professionals: "professionals",
  appointments: "appointments",
  txs: "transactions",
  products: "products",
  campaigns: "campaigns",
};
const ALL: Role[] = [
  "owner",
  "admin",
  "manager",
  "receptionist",
  "professional",
];
export const READ_ROLES: Record<CKey, Role[]> = {
  customers: ALL,
  services: ALL,
  professionals: ALL,
  appointments: ALL,
  txs: ["owner", "admin", "manager"],
  products: ALL,
  campaigns: ALL,
};
type Rec = Record<string, unknown>;
const REN: Partial<Record<CKey, Record<string, string>>> = {
  services: { min: "durationMinutes" },
  products: { qty: "quantity", min: "minQuantity", price: "salePrice" },
};
const inv = (m: Record<string, string>) =>
  Object.fromEntries(Object.entries(m).map(([a, b]) => [b, a]));
const clean = (o: Rec) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const ren = (o: Rec, m: Record<string, string> = {}) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [m[k] ?? k, v]));
const pad = (n: number) => String(n).padStart(2, "0");
export const localDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function toDoc(k: CKey, item: Rec, f: typeof FS): Rec {
  const { id: _id, ...rest } = item;
  void _id;
  if (k === "appointments") {
    const a = rest as {
        date: string;
        start: number;
        min: number;
        price: number;
      } & Rec,
      [y, m, d] = a.date.split("-").map(Number);
    const s = new Date(
        y,
        m - 1,
        d,
        Math.floor(a.start),
        Math.round((a.start % 1) * 60),
      ),
      e = new Date(s.getTime() + a.min * 60000);
    return clean({
      customerId: a.customerId,
      professionalId: a.professionalId,
      serviceId: a.serviceId,
      startAt: f.Timestamp.fromDate(s),
      endAt: f.Timestamp.fromDate(e),
      status: a.status,
      priceSnapshot: a.price,
    });
  }
  return clean(ren(rest, REN[k]));
}
export function toPatch(k: CKey, p: Rec): Rec {
  return k === "appointments"
    ? clean({ status: p.status })
    : clean(ren(p, REN[k]));
}

export function fromDoc(k: CKey, id: string, d: Rec): Rec | null {
  if (k === "appointments") {
    const st = d.startAt as FS.Timestamp | undefined,
      en = d.endAt as FS.Timestamp | undefined;

    if (!st?.toDate || !en?.toDate) return null;

    const s = st.toDate(),
      e = en.toDate();

    return {
      id,
      customerId: d.customerId,
      professionalId: d.professionalId,
      serviceId: d.serviceId,
      date: localDate(s),
      start: s.getHours() + s.getMinutes() / 60,
      min: Math.round((e.getTime() - s.getTime()) / 60000),
      price: Number(d.priceSnapshot ?? 0),
      status: d.status,
    };
  }

  const {
    createdAt: _c,
    id: _storedId,
    ...rest
  } = d;

  void _c;
  void _storedId;

  const o: Rec = {
    ...ren(rest, inv(REN[k] ?? {})),
    id,
  };

  if (k === "customers" && !o.lastVisit) {
    o.lastVisit = localDate(new Date());
  }

  if (k === "services" && !o.category) {
    o.category = "Geral";
  }

  return o;
}
