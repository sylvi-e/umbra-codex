"use client";
import { useEffect, useState } from "react";
import { Ban, RotateCcw, Search, Shield, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeading } from "@/components/umbra/page-heading";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
export function AdminUsers() {
  const [items, setItems] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  async function load() {
    const { data, error } = await createClient()!
      .from("profiles_with_role")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data ?? []) as Profile[]);
  }
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, []);
  async function setStatus(id: string, status: "active" | "suspended") {
    const { error } = await createClient()!.rpc("admin_set_user_status", {
      target_user_id: id,
      new_status: status,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(status === "active" ? "Conta reativada" : "Conta suspensa");
      void load();
    }
  }
  const filtered = items.filter((item) =>
    `${item.display_name} ${item.username}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="Administração"
        title="Usuários"
        description="Cargos são protegidos no banco e nunca escolhidos durante o cadastro."
      />
      <div className="relative mb-5 max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
          size={18}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
          placeholder="Pesquisar usuário"
        />
      </div>
      <div className="grim-card overflow-hidden rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <span className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-full bg-violet-500/10">
                      <UserRound size={17} />
                    </span>
                    <span>
                      <strong className="block">{item.display_name}</strong>
                      <small className="text-zinc-600">@{item.username}</small>
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <Shield size={14} />
                    {item.role}
                  </span>
                </TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell className="text-right">
                  {item.status === "active" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setStatus(item.id, "suspended")}
                    >
                      <Ban />
                      Suspender
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setStatus(item.id, "active")}
                    >
                      <RotateCcw />
                      Reativar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
