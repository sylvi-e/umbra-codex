"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/umbra/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { PageHeading } from "@/components/umbra/page-heading";
import { CharacterList } from "@/components/umbra/character-list";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
type Campaign = {
  id: string;
  name: string;
  owner_id: string;
  system_key: string;
  invite_code: string;
};
export function CampaignDetail({ campaignId }: { campaignId: string }) {
  const { user, profile } = useAuth();
  const [campaign, setCampaign] = useState<Campaign>();
  const [master, setMaster] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const client = createClient();
      if (!client || !user) return;
      const [result, member] = await Promise.all([
        client
          .from("campaigns")
          .select("id,name,owner_id,system_key,invite_code")
          .eq("id", campaignId)
          .single(),
        client
          .from("campaign_members")
          .select("role")
          .eq("campaign_id", campaignId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (result.error) setError("Campanha não encontrada ou sem permissão.");
      else {
        setCampaign(result.data);
        setMaster(
          result.data.owner_id === user.id ||
            profile?.role === "admin" ||
            ["master", "assistant_master"].includes(member.data?.role),
        );
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [campaignId, user, profile?.role]);
  if (error) return <p role="alert">{error}</p>;
  if (!campaign) return <p>Abrindo campanha…</p>;
  return (
    <>
      <PageHeading
        eyebrow={
          campaign.system_key === "organization"
            ? "A Organização"
            : "Shadow Slave"
        }
        title={campaign.name}
        description={
          master
            ? "Você administra esta campanha. Compartilhe o código para convidar jogadores."
            : "Crie e acompanhe seus personagens nesta campanha."
        }
        action={
          master ? (
            <Button
              variant="outline"
              onClick={() =>
                void navigator.clipboard
                  .writeText(campaign.invite_code)
                  .then(() => toast.success("Convite copiado"))
                  .catch(() => toast.error("Não foi possível copiar"))
              }
            >
              Convite: {campaign.invite_code}
            </Button>
          ) : undefined
        }
      />
      <Tabs defaultValue="players">
        <TabsList>
          <TabsTrigger value="players">Personagens</TabsTrigger>
          {master && <TabsTrigger value="npcs">NPCs do mestre</TabsTrigger>}
        </TabsList>
        <TabsContent value="players">
          <CharacterList campaignId={campaignId} />
        </TabsContent>
        {master && (
          <TabsContent value="npcs">
            <CharacterList campaignId={campaignId} kind="npc" />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
