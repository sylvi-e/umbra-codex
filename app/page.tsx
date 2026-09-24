import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Castle,
  Dice5,
  Eye,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
const features = [
  {
    icon: BookOpenText,
    title: "Fichas vivas",
    text: "Status, progressão, Aspectos, Memórias, Ecos e inventário no mesmo grimório.",
  },
  {
    icon: Castle,
    title: "Campanhas conectadas",
    text: "Convites, mestres, personagens, sessões e regras próprias por campanha.",
  },
  {
    icon: ShieldCheck,
    title: "Segredos protegidos",
    text: "Visibilidade por campo e políticas no banco para cada jogador, mestre e administrador.",
  },
];
export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="rune-grid pointer-events-none absolute inset-0 opacity-70" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <Link
          href="/"
          className="focus-ring flex items-center gap-3 rounded-lg"
          aria-label="Umbra Codex, início"
        >
          <span className="grid size-10 place-items-center rounded-xl border border-violet-400/30 bg-violet-500/10 text-violet-300">
            <Eye size={21} />
          </span>
          <span className="font-serif text-xl tracking-wide">Umbra Codex</span>
        </Link>
        <nav className="flex items-center gap-2" aria-label="Acesso">
          <Button asChild variant="ghost" className="text-zinc-300">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild className="bg-violet-600 hover:bg-violet-500">
            <Link href="/cadastro">Criar conta</Link>
          </Button>
        </nav>
      </header>
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-82px)] max-w-7xl items-center gap-12 px-5 py-14 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200/15 bg-amber-200/5 px-3 py-1.5 text-sm text-amber-100/80">
            <Sparkles size={15} /> Seu mundo. Suas regras. Seus segredos.
          </div>
          <h1 className="font-serif text-5xl leading-[1.04] tracking-[-.03em] text-white sm:text-6xl lg:text-7xl">
            Toda jornada deixa uma marca na{" "}
            <span className="bg-gradient-to-r from-violet-300 via-indigo-300 to-cyan-200 bg-clip-text text-transparent">
              alma.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
            Crie personagens, conduza campanhas e transforme regras de fantasia
            sombria em um sistema vivo, configurável e seguro.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 bg-violet-600 px-6 hover:bg-violet-500"
            >
              <Link href="/cadastro">
                Abrir meu grimório <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 border-white/10 bg-white/[.03]"
            >
              <Link href="/login">Já tenho uma conta</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500">
            <span className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-cyan-400" /> Permissões no
              banco
            </span>
            <span className="flex items-center gap-2">
              <Dice5 size={15} className="text-violet-400" /> Rolagens
              integradas
            </span>
          </div>
        </div>
        <div className="grim-card relative overflow-hidden rounded-[2rem] p-5 sm:p-7">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300/75">
                Registro desperto
              </p>
              <h2 className="mt-1 font-serif text-3xl">Clara Monteiro</h2>
            </div>
            <span className="rounded-full border border-cyan-300/15 bg-cyan-300/5 px-3 py-1 text-sm text-cyan-200">
              Desperto
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Status label="HP" value="24 / 28" tone="red" />
            <Status label="Essência" value="17 / 22" tone="violet" />
            <Status label="Núcleos" value="2 / 7" tone="gold" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-2xl border border-white/[.06] bg-white/[.025] p-4 first:sm:col-span-2"
              >
                <Icon className="mb-3 text-violet-300" size={20} />
                <h3 className="font-medium text-zinc-100">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-zinc-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
function Status({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "red" | "violet" | "gold";
}) {
  const colors = {
    red: "from-rose-500 to-rose-300",
    violet: "from-violet-600 to-indigo-300",
    gold: "from-amber-500 to-amber-200",
  };
  return (
    <div className="rounded-xl border border-white/[.06] bg-black/20 p-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <strong className="mt-1 block text-sm text-zinc-100">{value}</strong>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[.06]">
        <div className={`h-full w-3/4 bg-gradient-to-r ${colors[tone]}`} />
      </div>
    </div>
  );
}
