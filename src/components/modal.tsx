"use client";
import { FormEvent, ReactNode, useEffect } from "react";
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-bd bg-card p-5">
        <div className="mb-4 flex items-center"><h2 className="flex-1 text-lg font-bold">{title}</h2><button onClick={onClose} aria-label="Fechar" className="text-mu">✕</button></div>{children}
      </div>
    </div>
  );
}
export const Field = ({ label, children }: { label: string; children: ReactNode }) => <label className="block text-xs text-mu">{label}<div className="mt-1 text-sm text-tx">{children}</div></label>;
export const formData = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); return Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>; };
export const Actions = ({ onCancel, label = "Salvar" }: { onCancel: () => void; label?: string }) => <div className="mt-5 flex justify-end gap-2"><button type="button" className="rounded-xl border border-bd px-4 py-2" onClick={onCancel}>Cancelar</button><button className="btn">{label}</button></div>;
