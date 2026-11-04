"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { Query } from "firebase/firestore";
import { Segment } from "@/config/segments";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  CKey,
  COLL,
  READ_ROLES,
  fromDoc,
  localDate,
  toDoc,
  toPatch,
} from "@/modules/repository";
import { useTenant } from "@/lib/tenant/tenant-config";
import {
  AppUser,
  Appointment,
  Campaign,
  Customer,
  Product,
  Professional,
  Service,
  Status,
  Tx,
} from "@/types";
export interface Hour {
  day: string;
  on: boolean;
  open: string;
  close: string;
}
export interface Data {
  customers: Customer[];
  services: Service[];
  professionals: Professional[];
  appointments: Appointment[];
  txs: Tx[];
  products: Product[];
  users: AppUser[];
  campaigns: Campaign[];
  hours: Hour[];
}
export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => localDate(new Date());
export const addDays = (d: string, n: number) => {
  const x = new Date(d + "T12:00:00");
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
export const daysSince = (d: string) =>
  Math.floor((Date.now() - new Date(d + "T12:00:00").getTime()) / 864e5);
const pad = (n: number) => String(n).padStart(2, "0");
export const hh = (h: number) =>
  `${pad(Math.floor(h))}:${pad(Math.round((h % 1) * 60))}`;
export const last7 = (txs: Tx[], type: "in" | "out") =>
  Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today(), i - 6);
    return txs
      .filter((t) => t.type === type && t.date === d)
      .reduce((s, t) => s + t.amount, 0);
  });
function seed(seg: Segment): Data {
  const t = today();
  const professionals: Professional[] = seg.professionals.map((name, i) => ({
    id: "p" + i,
    name,
    rate: [50, 50, 45, 40][i] ?? 40,
    active: true,
  }));
  const services: Service[] = seg.services.map((s, i) => ({
    id: "s" + i,
    name: s.name,
    price: s.price,
    min: s.min,
    category: "Geral",
    active: true,
  }));
  const customers: Customer[] = seg.customers.map((name, i) => ({
    id: "c" + i,
    name,
    phone: `(48) 9983${i}-06${i}0`,
    lastVisit: addDays(t, -(i * 6 + 1)),
  }));
  const sts: Status[] = ["concluido", "confirmado", "agendado"];
  const slots = [
    [0, 8.5, 1],
    [0, 10, 1.5],
    [1, 9, 1],
    [1, 13, 1],
    [2, 10.5, 1],
    [2, 14, 1.5],
    [3, 8, 1],
    [3, 11.5, 1],
  ];
  const appointments: Appointment[] = slots.map(([p, s, h], k) => {
    const sv = services[k % services.length];
    return {
      id: "a" + k,
      customerId: customers[k % customers.length].id,
      professionalId: professionals[p].id,
      serviceId: sv.id,
      date: t,
      start: s,
      min: h * 60,
      price: sv.price,
      status: sts[k % 3],
    };
  });
  for (let k = 0; k < 14; k++) {
    const sv = services[k % services.length];
    appointments.push({
      id: "h" + k,
      customerId: customers[k % customers.length].id,
      professionalId: professionals[k % professionals.length].id,
      serviceId: sv.id,
      date: addDays(t, -(k % 7) - 1),
      start: 9 + (k % 5),
      min: sv.min,
      price: sv.price,
      status: "concluido",
    });
  }
  const txs: Tx[] = appointments
    .filter((a) => a.status === "concluido")
    .map((a) => ({
      id: "t" + a.id,
      type: "in",
      category: "Atendimento",
      desc: `${services.find((s) => s.id === a.serviceId)?.name} · ${customers.find((c) => c.id === a.customerId)?.name}`,
      amount: a.price,
      date: a.date,
    }));
  txs.push(
    {
      id: "o1",
      type: "out",
      category: "Aluguel",
      desc: "Aluguel do espaço",
      amount: 1800,
      date: addDays(t, -3),
    },
    {
      id: "o2",
      type: "out",
      category: "Produtos",
      desc: "Reposição de produtos",
      amount: 540,
      date: addDays(t, -1),
    },
  );
  return {
    customers,
    services,
    professionals,
    appointments,
    txs,
    products: seg.products.map((p, i) => ({ id: "pr" + i, ...p })),
    users: [
      {
        id: "u0",
        name: "Ana Paula",
        email: "ana@empresa.com",
        role: "owner",
        active: true,
      },
      {
        id: "u1",
        name: "Recepção",
        email: "recepcao@empresa.com",
        role: "receptionist",
        active: true,
      },
    ],
    campaigns: seg.campaigns.map((name, i) => ({
      id: "cp" + i,
      name,
      active: true,
    })),
    hours: [
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
      "Domingo",
    ].map((day, i) => ({
      day,
      on: i < 6,
      open: "09:00",
      close: i === 5 ? "17:00" : "19:00",
    })),
  };
}
interface Store {
  data: Data;
  query: string;
  setQuery: (q: string) => void;
  add: <K extends keyof Data>(k: K, item: Data[K][number]) => void;
  patch: <K extends keyof Data>(
    k: K,
    id: string,
    p: Partial<Data[K][number]>,
  ) => void;
  setHour: (i: number, p: Partial<Hour>) => void;
  saveError: string;
  clearError: () => void;
  notice: string;
  clearNotice: () => void;
}
const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);
const DEFAULT_HOURS: Hour[] = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
].map((day, i) => ({
  day,
  on: i < 6,
  open: "09:00",
  close: i === 5 ? "17:00" : "19:00",
}));
const emptyData = (): Data => ({
  customers: [],
  services: [],
  professionals: [],
  appointments: [],
  txs: [],
  products: [],
  users: [],
  campaigns: [],
  hours: DEFAULT_HOURS,
});
const AUDIT: CKey[] = ["txs", "professionals", "products"];
export function StoreProvider({ children }: { children: ReactNode }) {
  const { tenant, seg, mode } = useTenant(),
    { user, fb, getToken } = useAuth(),
    live = mode === "firebase";
  const [data, setData] = useState<Data>(() =>
    live ? emptyData() : seed(seg),
  );
  const [query, setQuery] = useState(""),
    [saveError, setSaveError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (!live) setData(seed(seg));
  }, [tenant.segment, live]); // eslint-disable-line react-hooks/exhaustive-deps
  // Dados operacionais: Firestore do CLIENTE em tempo real (as Rules usam o papel que veio nos claims da sessão).
  useEffect(() => {
    if (!live || !fb || !user) return;
    const { f, db } = fb,
      offs: (() => void)[] = [];
    setData(emptyData());
    (Object.keys(COLL) as CKey[]).forEach((k) => {
      if (!READ_ROLES[k].includes(user.role)) return;
      let q: Query = f.collection(db, COLL[k]);
      if (k === "appointments" && user.role === "professional") {
        if (!user.professionalId) return;
        q = f.query(q, f.where("professionalId", "==", user.professionalId));
      }
      offs.push(
        f.onSnapshot(
          q,
          (s) =>
            setData(
              (d) =>
                ({
                  ...d,
                  [k]: s.docs
                    .map((x) => fromDoc(k, x.id, x.data()))
                    .filter(Boolean),
                }) as unknown as Data,
            ),
          () => setSaveError("Sem permissão para carregar alguns dados."),
        ),
      );
    });
    offs.push(
      f.onSnapshot(
        f.doc(db, "settings", "main"),
        (s) => {
          const h = s.data()?.hours;
          if (Array.isArray(h)) setData((d) => ({ ...d, hours: h as Hour[] }));
        },
        () => {},
      ),
    );
    return () => offs.forEach((o) => o());
  }, [live, fb, user]);
  // Usuários da empresa: vivem no Firebase master e são geridos pelo servidor (/api/team) — somente owner/admin.
  const team = async (method: string, body?: unknown) => {
    const t = await getToken();
    if (!t) throw new Error("auth");
    const r = await fetch("/api/team", {
        method,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${t}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
      j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? "error");
    return j;
  };
  const refreshUsers = async () => {
    try {
      const j = await team("GET");
      setData((d) => ({ ...d, users: j.users }));
    } catch {}
  };
  useEffect(() => {
    if (live && user && ["owner", "admin"].includes(user.role))
      void refreshUsers();
  }, [live, user]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (
    k: CKey,
    id: string,
    action: string,
    op: () => Promise<unknown>,
  ) => {
    if (!fb || !user) return;
    try {
      await op();
      if (AUDIT.includes(k))
        await fb.f.addDoc(fb.f.collection(fb.db, "audit_logs"), {
          actorUid: user.uid,
          action,
          entity: COLL[k],
          entityId: id,
          timestamp: fb.f.serverTimestamp(),
        });
      setSaveError("");
    } catch (error) {
  if (error instanceof Error) {
    const firebaseError = error as Error & {
      code?: string;
      customData?: unknown;
    };

    console.error("[FIRESTORE SAVE ERROR]", {
      collection: k,
      documentId: id,
      action,
      name: firebaseError.name,
      code: firebaseError.code,
      message: firebaseError.message,
      customData: firebaseError.customData,
      error,
    });

    setSaveError(
      `${firebaseError.code ?? "Erro"}: ${firebaseError.message}`,
    );
  } else {
    console.error("[FIRESTORE SAVE ERROR]", error);
    setSaveError("Erro desconhecido ao salvar.");
  }
}
  };
  const add: Store["add"] = (k, item) => {
    if (live && k === "users") {
      const u = item as unknown as AppUser;
      team("POST", { name: u.name, email: u.email, role: u.role })
        .then((j) => {
          setNotice(
            `Usuário criado. Envie este link para ele definir a senha: ${j.resetLink}`,
          );
          return refreshUsers();
        })
        .catch((e) =>
          setSaveError(
            e.message === "email_in_use"
              ? "Este e-mail já está vinculado a outra empresa."
              : "Não foi possível criar o usuário.",
          ),
        );
      return;
    }
    if (live && fb) {
      const it = item as unknown as { id: string },
        c = k as CKey;
      void run(c, it.id, "create", () =>
        fb.f.setDoc(fb.f.doc(fb.db, COLL[c], it.id), {
          ...toDoc(c, item as unknown as Record<string, unknown>, fb.f),
          createdAt: fb.f.serverTimestamp(),
        }),
      );
      return;
    }
    setData((d) => ({ ...d, [k]: [...(d[k] as unknown[]), item] }) as Data);
  };
  const patch: Store["patch"] = (k, id, p) => {
    if (live && k === "users") {
      team("PATCH", { id, ...(p as object) })
        .then(refreshUsers)
        .catch(() => setSaveError("Não foi possível alterar o usuário."));
      return;
    }

    if (live && fb) {
      const c = k as CKey;

      void run(c, id, "update", async () => {
        await fb.f.updateDoc(
          fb.f.doc(fb.db, COLL[c], id),
          toPatch(c, p as unknown as Record<string, unknown>) as never,
        );

        if (k === "appointments" && "status" in p && p.status === "concluido") {
          const appointment = data.appointments.find((a) => a.id === id);

          if (!appointment) {
            throw new Error("Agendamento não encontrado.");
          }

          const customer = data.customers.find(
            (customer) => customer.id === appointment.customerId,
          );

          const service = data.services.find(
            (service) => service.id === appointment.serviceId,
          );

          const txId = `appointment_${id}`;

          const tx: Tx = {
            id: txId,
            type: "in",
            category: "Atendimento",
            desc: `${service?.name ?? "Atendimento"} · ${customer?.name ?? "Cliente"}`,
            amount: appointment.price,
            date: appointment.date,
            appointmentId: id,
          };

          await fb.f.setDoc(fb.f.doc(fb.db, COLL.txs, txId), {
            ...toDoc("txs", tx as unknown as Record<string, unknown>, fb.f),
            createdAt: fb.f.serverTimestamp(),
          });
        }
      });

      return;
    }

    setData(
      (d) =>
        ({
          ...d,
          [k]: (d[k] as unknown as { id: string }[]).map((x) =>
            x.id === id ? { ...x, ...p } : x,
          ),
        }) as Data,
    );
  };
  const setHour: Store["setHour"] = (i, p) => {
    const next = data.hours.map((h, j) => (j === i ? { ...h, ...p } : h));
    setData((d) => ({ ...d, hours: next }));
    if (live && fb)
      fb.f
        .setDoc(
          fb.f.doc(fb.db, "settings", "main"),
          { hours: next },
          { merge: true },
        )
        .catch(() => setSaveError("Não foi possível salvar o horário."));
  };
  return (
    <Ctx.Provider
      value={{
        data,
        query,
        setQuery,
        add,
        patch,
        setHour,
        saveError,
        clearError: () => setSaveError(""),
        notice,
        clearNotice: () => setNotice(""),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
