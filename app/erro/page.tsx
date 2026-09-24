import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function Page() {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <section className="grim-card max-w-md rounded-3xl p-8 text-center">
        <AlertTriangle className="mx-auto text-amber-300" size={38} />
        <h1 className="mt-5 font-serif text-3xl">Algo interrompeu o ritual</h1>
        <p className="mt-3 text-zinc-500">
          Tente novamente. Se o problema continuar, procure o administrador.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Voltar ao painel</Link>
        </Button>
      </section>
    </main>
  );
}
