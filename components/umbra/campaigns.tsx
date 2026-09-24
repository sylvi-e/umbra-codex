"use client";
import { useEffect, useState } from "react";
import { Castle, KeyRound, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeading } from "@/components/umbra/page-heading";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/umbra/auth-provider";
type Campaign = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  invite_code: string;
  created_at: string;
};
export function Campaigns() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<Campaign[]>([]);
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  async function load() {
    const { data } = await createClient()!
      .from("campaigns")
      .select("id,name,description,status,invite_code,created_at")
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Campaign[]);
  }
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, []);
  async function create(formData: FormData) {
    if (!user) return;
    const name = String(formData.get("name") ?? "").trim();
    if (name.length < 2) {
      toast.error("Informe o nome da campanha.");
      return;
    }
    const { error } = await createClient()!
      .from("campaigns")
      .insert({
        name,
        description: String(formData.get("description") ?? "") || null,
        owner_id: user.id,
        status: "active",
      });
    if (error) toast.error(error.message);
    else {
      toast.success("Campanha criada");
      setOpen(false);
      void load();
    }
  }
  async function deleteCampaign(campaign: Campaign) {
    setDeletingId(campaign.id);
    const { error } = await createClient()!
      .from("campaigns")
      .delete()
      .eq("id", campaign.id);
    setDeletingId(null);
    if (error) {
      toast.error(`Não foi possível excluir a campanha: ${error.message}`);
      return;
    }
    setItems((current) => current.filter((item) => item.id !== campaign.id));
    toast.success(`Campanha “${campaign.name}” excluída`);
  }
  return (
    <>
      <PageHeading
        eyebrow="Jornadas compartilhadas"
        title="Campanhas"
        description="Reúna personagens, regras e sessões em um único lugar."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-500">
                <Plus />
                Nova campanha
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">
                  Criar campanha
                </DialogTitle>
                <DialogDescription>
                  Você será o mestre responsável e poderá convidar jogadores.
                </DialogDescription>
              </DialogHeader>
              <form action={create} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" name="description" />
                </div>
                <DialogFooter>
                  <Button type="submit">Criar campanha</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {items.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="grim-card rounded-2xl p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <Castle />
              </span>
              <h2 className="mt-5 font-serif text-2xl">{item.name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-500">
                {item.description || "Sem descrição."}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.06] pt-4 text-sm text-zinc-500">
                <span className="flex items-center gap-2">
                  <Users size={15} />
                  Campanha ativa
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white/[.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(item.invite_code)
                        .then(() => toast.success("Código copiado"))
                    }
                  >
                    <KeyRound size={15} />
                    {item.invite_code}
                  </button>
                  {profile?.role === "admin" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-300 hover:bg-red-500/10 hover:text-red-200"
                          aria-label={`Excluir campanha ${item.name}`}
                          disabled={deletingId !== null}
                        >
                          <Trash2 />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A campanha “{item.name}” será excluída permanentemente.
                            As fichas continuarão existindo, mas deixarão de estar
                            vinculadas a ela. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => void deleteCampaign(item)}
                          >
                            Excluir permanentemente
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grim-card rounded-2xl p-10 text-center">
          <Castle className="mx-auto text-cyan-300" />
          <h2 className="mt-4 font-serif text-2xl">Nenhuma campanha</h2>
          <p className="mt-2 text-zinc-500">
            Crie uma jornada ou participe por convite.
          </p>
        </div>
      )}
    </>
  );
}
