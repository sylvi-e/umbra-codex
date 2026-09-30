import Link from "next/link";
import { BookX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <section className="grim-card max-w-lg rounded-3xl p-8 text-center">
        <BookX className="mx-auto text-violet-300" size={36} />
        <p className="mt-4 text-sm uppercase tracking-[.18em] text-violet-300/70">
          Registro não encontrado
        </p>
        <h1 className="mt-2 font-serif text-4xl">Esta página se perdeu no vazio</h1>
        <p className="mt-3 text-zinc-400">
          O endereço pode ter mudado ou você pode não ter acesso a este registro.
        </p>
        <Button asChild className="mt-6 bg-violet-600 hover:bg-violet-500">
          <Link href="/dashboard">Voltar ao grimório</Link>
        </Button>
      </section>
    </main>
  );
}
