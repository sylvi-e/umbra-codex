"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpenText,
  Castle,
  Clock3,
  Heart,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/umbra/page-heading";
import { useAuth } from "@/components/umbra/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { CharacterSummary } from "@/lib/types";
type Campaign = {
  id: string;
  name: string;
  status: string;
  cover_url: string | null;
};
export function Dashboard() {
  const { profile } = useAuth();
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const client = createClient();
    if (!client) return;
    void Promise.all([
      client
        .from("character_summary")
        .select("*")
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(4),
      client
        .from("campaigns")
        .select("id,name,status,cover_url")
        .is("archived_at", null)
        .limit(3),
    ])
      .then(([sheets, camps]) => {
        setCharacters((sheets.data ?? []) as CharacterSummary[]);
        setCampaigns((camps.data ?? []) as Campaign[]);
      })
      .finally(() => setLoading(false));
  }, []);
  return (
    <>
      <PageHeading
        eyebrow="Seu grimório"
        title={`Bem-vindo, ${profile?.display_name?.split(" ")[0] ?? "Desperto"}`}
        description="Continue de onde parou ou abra um novo registro."
        action={
          <Button asChild className="bg-violet-600 hover:bg-violet-500">
            <Link href="/fichas/nova">
              <Plus />
              Nova ficha
            </Link>
          </Button>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={BookOpenText}
          label="Fichas ativas"
          value={characters.length.toString()}
        />
        <Metric
          icon={Castle}
          label="Campanhas"
          value={campaigns.length.toString()}
        />
        <Metric icon={Sparkles} label="Convites" value="0" />
        <Metric icon={Activity} label="Alterações hoje" value="—" />
      </section>
      <section className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Personagens recentes</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/fichas">
                Ver todos <ArrowUpRight />
              </Link>
            </Button>
          </div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ) : characters.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {characters.map((character) => (
                <CharacterCard key={character.id} character={character} />
              ))}
            </div>
          ) : (
            <Empty
              title="Nenhuma ficha criada"
              text="Seu primeiro personagem começa com um registro vazio e configurável."
              href="/fichas/nova"
            />
          )}
        </div>
        <aside>
          <h2 className="mb-4 font-serif text-2xl">Campanhas ativas</h2>
          <div className="grim-card rounded-2xl p-3">
            {campaigns.length ? (
              campaigns.map((c) => (
                <Link
                  key={c.id}
                  href="/campanhas"
                  className="flex items-center gap-3 rounded-xl p-3 hover:bg-white/[.04]"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <Castle size={19} />
                  </span>
                  <span>
                    <strong className="block text-sm">{c.name}</strong>
                    <span className="text-xs text-zinc-500">{c.status}</span>
                  </span>
                </Link>
              ))
            ) : (
              <p className="p-5 text-sm leading-6 text-zinc-500">
                Você ainda não participa de uma campanha.
              </p>
            )}
          </div>
          <h2 className="mb-4 mt-7 font-serif text-2xl">Atividade</h2>
          <div className="grim-card rounded-2xl p-5">
            <p className="flex items-center gap-2 text-sm text-zinc-400">
              <Clock3 size={16} /> O histórico aparecerá aqui após sua primeira
              alteração.
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Heart;
  label: string;
  value: string;
}) {
  return (
    <article className="grim-card rounded-2xl p-5">
      <Icon size={20} className="text-violet-300" />
      <strong className="mt-5 block text-3xl">{value}</strong>
      <span className="mt-1 block text-sm text-zinc-500">{label}</span>
    </article>
  );
}
function CharacterCard({ character: c }: { character: CharacterSummary }) {
  const hp = c.max_hp ? Math.min(100, (c.current_hp / c.max_hp) * 100) : 0;
  return (
    <Link
      href={`/fichas/${c.id}`}
      className="grim-card group rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[.13em] text-violet-300/70">
            {c.rank_name ?? "Sem rank"} · {c.class_name ?? "Sem classe"}
          </p>
          <h3 className="mt-2 font-serif text-2xl">{c.name}</h3>
          <p className="mt-1 text-sm text-zinc-500">
            {c.true_name || "Nome Verdadeiro desconhecido"}
          </p>
        </div>
        <ArrowUpRight className="text-zinc-700 transition-colors group-hover:text-violet-300" />
      </div>
      <div className="mt-6">
        <div className="mb-2 flex justify-between text-xs">
          <span className="text-zinc-500">Vitalidade</span>
          <span>
            {c.current_hp}/{c.max_hp}
          </span>
        </div>
        <Progress value={hp} className="h-1.5" />
      </div>
      <div className="mt-4 flex gap-2 text-xs text-zinc-500">
        <span className="rounded-full bg-white/[.04] px-2.5 py-1">
          {c.soul_cores} núcleos
        </span>
        <span className="rounded-full bg-white/[.04] px-2.5 py-1">
          {c.status}
        </span>
      </div>
    </Link>
  );
}
function Empty({
  title,
  text,
  href,
}: {
  title: string;
  text: string;
  href: string;
}) {
  return (
    <div className="grim-card rounded-2xl p-8 text-center">
      <BookOpenText className="mx-auto text-violet-300" />
      <h3 className="mt-4 font-serif text-xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
        {text}
      </p>
      <Button asChild className="mt-5">
        <Link href={href}>Criar ficha</Link>
      </Button>
    </div>
  );
}
