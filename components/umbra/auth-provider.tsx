"use client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = hasSupabaseConfig();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(configured);
  async function loadProfile(userId?: string) {
    const client = createClient();
    const id = userId ?? session?.user.id;
    if (!client || !id) {
      setProfile(null);
      return;
    }
    const { data } = await client
      .from("profiles_with_role")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }
  useEffect(() => {
    if (!configured) return;
    const client = createClient();
    if (!client) return;
    void client.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setSession(data.session);
      void loadProfile(data.session?.user.id).finally(() => setLoading(false));
    });
    const { data } = client.auth.onAuthStateChange((_event: AuthChangeEvent, next: Session | null) => {
      setSession(next);
      void loadProfile(next?.user.id);
    });
    return () => data.subscription.unsubscribe();
  }, [configured]);
  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      refreshProfile: () => loadProfile(),
    }),
    [configured, loading, session, profile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
