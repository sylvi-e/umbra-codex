"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeading } from "@/components/umbra/page-heading";
import { useAuth } from "@/components/umbra/auth-provider";
import { createClient } from "@/lib/supabase/client";
export function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth();
  const [password, setPassword] = useState("");
  async function save(formData: FormData) {
    const { error } = await createClient()!
      .from("profiles")
      .update({
        display_name: String(formData.get("displayName") ?? ""),
        username: String(formData.get("username") ?? "").toLowerCase(),
      })
      .eq("id", user!.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Perfil atualizado");
      await refreshProfile();
    }
  }
  async function updatePassword() {
    if (password.length < 8) {
      toast.error("Use ao menos 8 caracteres.");
      return;
    }
    const { error } = await createClient()!.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else {
      toast.success("Senha redefinida");
      setPassword("");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="Sua conta"
        title="Perfil"
        description="Gerencie sua identidade e credenciais."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <form action={save} className="grim-card rounded-2xl p-6">
          <h2 className="font-serif text-2xl">Informações públicas</h2>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={profile?.display_name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Nome de usuário</Label>
              <Input
                id="username"
                name="username"
                defaultValue={profile?.username}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={user?.email ?? ""} disabled />
            </div>
            <Button type="submit">Salvar perfil</Button>
          </div>
        </form>
        <section className="grim-card rounded-2xl p-6">
          <h2 className="font-serif text-2xl">Segurança</h2>
          <p className="mt-2 text-sm text-zinc-500">
            A nova senha deve ter ao menos oito caracteres.
          </p>
          <div className="mt-6 space-y-3">
            <Label htmlFor="newPassword">Nova senha</Label>
            <Input
              id="newPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Button
              onClick={updatePassword}
              variant="outline"
              className="border-white/10"
            >
              Redefinir senha
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
