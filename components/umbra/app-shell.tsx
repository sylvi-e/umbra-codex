"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpenText,
  Castle,
  ChevronDown,
  Dices,
  Eye,
  LayoutDashboard,
  LogOut,
  Menu,
  PersonStanding,
  Settings,
  Shield,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/umbra/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { WebMcpTools } from "@/components/umbra/webmcp-tools";
const playerNav = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/fichas", label: "Fichas", icon: BookOpenText },
  { href: "/campanhas", label: "Campanhas", icon: Castle },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];
const adminNav = [
  { href: "/admin", label: "Administração", icon: Shield },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/configuracoes", label: "Sistema", icon: Settings },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const { configured, loading, user, profile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (configured && !loading && !user)
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
  }, [configured, loading, user, pathname, router]);
  if (loading) return <Loading />;
  if (!configured) return <SetupPending />;
  if (!user) return <Loading />;
  const isAdmin = profile?.role === "admin";
  const visiblePlayerNav = isAdmin
    ? [
        ...playerNav.slice(0, 2),
        { href: "/npcs", label: "NPCs", icon: PersonStanding },
        ...playerNav.slice(2),
      ]
    : playerNav;
  const inNpcArea = pathname === "/npcs" || pathname.startsWith("/npcs/");
  async function signOut() {
    await createClient()?.auth.signOut();
    router.replace("/login");
  }
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <WebMcpTools />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-white/[.07] bg-[#0a0910]/95 p-4 backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex items-center justify-between px-2 py-2">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
              <Eye size={21} />
            </span>
            <span className="font-serif text-xl">Umbra Codex</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X />
          </Button>
        </div>
        <nav className="mt-8 space-y-1" aria-label="Principal">
          {visiblePlayerNav.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={
                pathname === item.href || pathname.startsWith(item.href + "/")
              }
              onClick={() => setOpen(false)}
            />
          ))}
        </nav>
        {isAdmin && (
          <>
            <p className="mb-2 mt-8 px-3 text-xs font-semibold uppercase tracking-[.16em] text-zinc-600">
              Controle do mestre
            </p>
            <nav className="space-y-1">
              {adminNav.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/")
                  }
                  onClick={() => setOpen(false)}
                />
              ))}
            </nav>
          </>
        )}
        <div className="mt-auto rounded-2xl border border-white/[.06] bg-white/[.025] p-3">
          <Link href="/perfil" className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="bg-violet-600/20 text-violet-200">
                {(profile?.display_name ?? user.email ?? "U")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-medium">
                {profile?.display_name ?? "Jogador"}
              </strong>
              <span className="block truncate text-xs text-zinc-500">
                {profile?.role === "admin" ? "Administrador" : "Jogador"}
              </span>
            </span>
            <ChevronDown size={16} className="text-zinc-600" />
          </Link>
          <Button
            variant="ghost"
            className="mt-2 w-full justify-start text-zinc-400"
            onClick={signOut}
          >
            <LogOut /> Sair
          </Button>
        </div>
      </aside>
      <div className="min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[.06] bg-[#08070c]/80 px-4 backdrop-blur-xl lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            className="lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu />
          </Button>
          <div className="hidden items-center gap-2 text-sm text-zinc-500 sm:flex">
            <Dices size={16} /> Rolagens e alterações são registradas
          </div>
          <Button
            asChild
            size="sm"
            className="ml-auto bg-violet-600 hover:bg-violet-500"
          >
            <Link href={inNpcArea ? "/npcs/nova" : "/fichas/nova"}>{inNpcArea ? "Novo NPC" : "Nova ficha"}</Link>
          </Button>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <nav
        className={`fixed inset-x-3 bottom-3 z-40 grid ${isAdmin ? "grid-cols-5" : "grid-cols-4"} rounded-2xl border border-white/10 bg-[#111018]/95 p-1 shadow-2xl backdrop-blur-xl lg:hidden`}
        aria-label="Navegação móvel"
      >
        {visiblePlayerNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs ${pathname.startsWith(item.href) ? "bg-violet-500/15 text-violet-200" : "text-zinc-500"}`}
          >
            <item.icon size={19} />
            {item.label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof Eye;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${active ? "bg-violet-500/14 text-violet-100" : "text-zinc-400 hover:bg-white/[.04] hover:text-white"}`}
    >
      <Icon size={19} />
      {label}
    </Link>
  );
}
function Loading() {
  return (
    <main className="grid min-h-screen place-items-center">
      <div className="w-72 space-y-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </main>
  );
}
function SetupPending() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="grim-card max-w-lg rounded-3xl p-8 text-center">
        <Shield className="mx-auto text-violet-300" size={36} />
        <h1 className="mt-5 font-serif text-3xl">Conexão protegida pendente</h1>
        <p className="mt-3 leading-7 text-zinc-400">
          A aplicação está instalada. Falta vincular o projeto Supabase desta
          campanha para ativar contas, fichas e sincronização.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </section>
    </main>
  );
}
