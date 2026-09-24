"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
export default function Page() {
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const next = params.get("next");
    const destination = next?.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";
    const client = createClient();
    if (!client) {
      router.replace("/login");
      return;
    }
    if (code)
      void client.auth
        .exchangeCodeForSession(code)
        .then(({ error }: { error: AuthError | null }) => {
          router.replace(error ? "/login?erro=oauth" : destination);
        });
    else router.replace("/login?erro=oauth");
  }, [router]);
  return (
    <main className="grid min-h-screen place-items-center">
      <p className="flex items-center gap-3 text-zinc-400">
        <LoaderCircle className="animate-spin" />
        Confirmando seu registro…
      </p>
    </main>
  );
}
