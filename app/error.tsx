"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Umbra Codex route error", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <section className="grim-card max-w-lg rounded-3xl p-8 text-center">
        <AlertTriangle className="mx-auto text-amber-300" size={32} />
        <h1 className="mt-4 font-serif text-3xl">O grimório encontrou um erro</h1>
        <p className="mt-3 text-zinc-400">
          Seus dados não foram apagados. Tente carregar esta área novamente.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-zinc-600">
            Referência: {error.digest}
          </p>
        ) : null}
        <Button onClick={reset} className="mt-6 bg-violet-600 hover:bg-violet-500">
          <RotateCcw />
          Tentar novamente
        </Button>
      </section>
    </main>
  );
}
