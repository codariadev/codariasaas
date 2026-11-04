import { ReactNode } from "react";
import { Status } from "@/types";
export const Card = ({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={`min-w-0 rounded-2xl border border-bd bg-card p-4 ${className}`}
  >
    {title && <h3 className="mb-3 font-semibold">{title}</h3>}
    {children}
  </section>
);
export const Kpi = ({
  label,
  value,
  delta,
  down,
}: {
  label: string;
  value: string;
  delta?: string;
  down?: boolean;
}) => (
  <Card>
    <small className="text-mu">{label}</small>
    <b className="my-1 block text-2xl">{value}</b>
    {delta && (
      <span className={`text-xs ${down ? "text-bad" : "text-ok"}`}>
        {delta}
      </span>
    )}
  </Card>
);
type Tone = "ac" | "ok" | "bad" | "warn";
export const Tag = ({
  children,
  tone = "ac",
}: {
  children: ReactNode;
  tone?: Tone;
}) => (
  <span
    className={`rounded-full px-2.5 py-0.5 text-xs ${{ ac: "bg-soft text-ac", ok: "bg-ok/15 text-ok", bad: "bg-bad/15 text-bad", warn: "bg-warn/15 text-warn" }[tone]}`}
  >
    {children}
  </span>
);
export const statusTone = (s: Status): Tone =>
  s === "concluido"
    ? "ok"
    : s === "cancelado" || s === "faltou"
      ? "bad"
      : s === "agendado"
        ? "warn"
        : "ac";
export const Table = ({
  head,
  rows,
  empty = "Nenhum registro encontrado.",
}: {
  head: string[];
  rows: ReactNode[][];
  empty?: string;
}) => (
  <div className="overflow-x-auto">
    <table className="w-full whitespace-nowrap text-sm">
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} className="p-2 text-left text-xs font-medium text-mu">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-bd">
            {r.map((c, j) => (
              <td key={j} className="p-2.5">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    {rows.length === 0 && <p className="p-6 text-center text-mu">{empty}</p>}
  </div>
);
export const Page = ({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
}) => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <h1 className="flex-1 text-2xl font-bold">{title}</h1>
      {action && (
        <button className="btn" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
    {children}
  </div>
);
