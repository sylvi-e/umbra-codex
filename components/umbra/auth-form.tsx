"use client";

import { Eye, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/umbra/auth-provider";
import { Button } from "@/components/ui/button";
import { getGoogleIdToken, hasFirebaseConfig } from "@/lib/firebase/client";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { configured } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signInWithGoogle() {
    setLoading(true);
    setError("");
    try {
      const client = createClient();
      if (!client) throw new Error("O banco ainda não foi conectado a esta publicação.");
      if (!hasFirebaseConfig()) throw new Error("O login Google ainda não foi configurado nesta publicação.");

      const idToken = await getGoogleIdToken();
      const { data: responseData, error: bridgeError } =
        await client.functions.invoke("google-auth-bridge", { body: { idToken } });
      const data = responseData as { tokenHash?: string; error?: string } | null;
      if (bridgeError) {
        let bridgeMessage = bridgeError.message;
        const context = (bridgeError as { context?: Response }).context;
        if (context) {
          try {
            const details = (await context.clone().json()) as { error?: string };
            if (details.error) bridgeMessage = details.error;
          } catch {
            // Mantém a mensagem original quando a resposta não contém JSON.
          }
        }
        throw new Error(bridgeMessage);
      }
      if (!data?.tokenHash) throw new Error(data?.error ?? "A sessão Google não foi criada.");

      const { error: authError } = await client.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: "email",
      });
      if (authError) throw authError;
      router.replace("/dashboard");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar com o Google.");
      setLoading(false);
    }
  }

  const title = mode === "login" ? "Retorne ao Codex" : "Crie seu registro";
  const description = mode === "login"
    ? "Abra suas fichas e continue a jornada."
    : "Entre com o Google. Sua função inicial será Jogador.";

  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-12">
      <div className="rune-grid pointer-events-none absolute inset-0 opacity-60" />
      <section className="grim-card relative z-10 w-full max-w-md rounded-[1.6rem] p-6 sm:p-8">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Eye /></span>
          <span className="font-serif text-xl">Umbra Codex</span>
        </Link>
        <h1 className="font-serif text-3xl">{title}</h1>
        <p className="mt-2 text-zinc-400">{description}</p>

        {!configured && (
          <p role="alert" className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">
            A interface está pronta, mas esta publicação ainda aguarda a conexão com o projeto Supabase.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          disabled={loading || !configured}
          onClick={signInWithGoogle}
          className="mt-7 h-11 w-full border-white/15 bg-white/[0.04] hover:bg-white/[0.09]"
        >
          {loading ? <LoaderCircle className="animate-spin" /> : <GoogleIcon />}
          Continuar com Google
        </Button>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">{error}</p>
        )}

        <div className="mt-5 text-sm text-zinc-400">
          {mode === "login" ? (
            <Link className="hover:text-white" href="/cadastro">Criar conta com Google</Link>
          ) : (
            <Link className="hover:text-white" href="/login">Voltar para o login</Link>
          )}
        </div>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" focusable="false">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.35l-3.24-2.55c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.63A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.44H3.04A10 10 0 0 0 2 12c0 1.64.39 3.19 1.04 4.56l3.35-2.63Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.44l3.35 2.63C7.18 7.7 9.39 5.94 12 5.94Z" />
    </svg>
  );
}
