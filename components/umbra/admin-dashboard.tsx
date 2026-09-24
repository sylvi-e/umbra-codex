"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, BookOpenText, Castle, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/umbra/page-heading";
import { useAuth } from "@/components/umbra/auth-provider";
import { createClient } from "@/lib/supabase/client";
export function AdminDashboard() {
  const { profile } = useAuth();
  const [counts, setCounts] = useState({
    users: 0,
    sheets: 0,
    campaigns: 0,
    invites: 0,
  });
  useEffect(() => {
    if (profile?.role !== "admin") return;
    const c = createClient()!;
    void Promise.all([
      c.from("profiles").select("id", { count: "exact", head: true }),
      c.from("character_sheets").select("id", { count: "exact", head: true }),
      c
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      c
        .from("invitations")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]).then(([u, s, ca, i]) =>
      setCounts({
        users: u.count ?? 0,
        sheets: s.count ?? 0,
        campaigns: ca.count ?? 0,
        invites: i.count ?? 0,
      }),
    );
  }, [profile]);
  if (profile?.role !== "admin")
    return (
      <div className="grim-card rounded-2xl p-8 text-center">
        <h1 className="font-serif text-3xl">Acesso negado</h1>
        <p className="mt-2 text-zinc-500">
          Esta área é exclusiva para administradores.
        </p>
      </div>
    );
  return (
    <>
      <PageHeading
        eyebrow="Controle do sistema"
        title="Administração"
        description="Visão geral de contas, fichas, campanhas e configurações."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="Usuários" value={counts.users} />
        <Metric icon={BookOpenText} label="Fichas" value={counts.sheets} />
        <Metric
          icon={Castle}
          label="Campanhas ativas"
          value={counts.campaigns}
        />
        <Metric
          icon={Activity}
          label="Convites pendentes"
          value={counts.invites}
        />
      </div>
      <div className="mt-7 grid gap-5 md:grid-cols-3">
        <Shortcut
          href="/admin/usuarios"
          icon={Users}
          title="Gerenciar usuários"
          text="Suspender, reativar e consultar contas."
        />
        <Shortcut
          href="/admin/fichas"
          icon={BookOpenText}
          title="Todas as fichas"
          text="Visualizar e administrar registros."
        />
        <Shortcut
          href="/admin/configuracoes"
          icon={Settings}
          title="Configurar sistema"
          text="Ranks, classes, temas e permissões."
        />
      </div>
    </>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="grim-card rounded-2xl p-5">
      <Icon className="text-violet-300" />
      <strong className="mt-5 block text-3xl">{value}</strong>
      <span className="text-sm text-zinc-500">{label}</span>
    </div>
  );
}
function Shortcut({
  href,
  icon: Icon,
  title,
  text,
}: {
  href: string;
  icon: typeof Users;
  title: string;
  text: string;
}) {
  return (
    <article className="grim-card rounded-2xl p-5">
      <Icon className="text-cyan-300" />
      <h2 className="mt-4 font-serif text-xl">{title}</h2>
      <p className="mt-2 min-h-12 text-sm text-zinc-500">{text}</p>
      <Button asChild variant="outline" className="mt-4 border-white/10">
        <Link href={href}>Abrir</Link>
      </Button>
    </article>
  );
}
