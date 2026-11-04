"use client";
import Link from "next/link";
import { useState } from "react";
import { Field, formData } from "@/components/modal";
import { useAuth } from "@/lib/auth/auth-provider";
export default function Recuperar() {
  const { resetPassword } = useAuth(); const [sent, setSent] = useState(false);
  return (
    <form onSubmit={async (e) => { await resetPassword(formData(e).email.trim()); setSent(true); }} className="w-full max-w-sm space-y-4 rounded-2xl border border-bd bg-card p-6">
      <h1 className="text-xl font-bold">Recuperar senha</h1>
      {sent ? <p className="text-ok">Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.</p> : <><Field label="E-mail"><input name="email" type="email" required className="inp" /></Field><button className="btn w-full">Enviar link</button></>}
      <Link href="/login" className="block text-center text-sm text-ac">Voltar ao login</Link>
    </form>
  );
}
