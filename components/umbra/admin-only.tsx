"use client";

import { Shield } from "lucide-react";
import { useAuth } from "@/components/umbra/auth-provider";

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  if (profile?.role !== "admin") {
    return (
      <section className="grim-card rounded-2xl p-8 text-center">
        <Shield className="mx-auto text-violet-300" size={34} />
        <h1 className="mt-4 font-serif text-3xl">Acesso negado</h1>
        <p className="mt-2 text-zinc-500">A área de NPCs é exclusiva para administradores.</p>
      </section>
    );
  }

  return children;
}
