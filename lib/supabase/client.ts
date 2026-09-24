import { createBrowserClient } from "@supabase/ssr";
let browserClient: ReturnType<typeof createBrowserClient> | null = null;
export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
export function createClient() {
  if (!hasSupabaseConfig()) return null;
  if (!browserClient)
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  return browserClient;
}
