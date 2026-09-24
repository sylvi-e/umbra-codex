"use client";
import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { PageHeading } from "@/components/umbra/page-heading";
import { createClient } from "@/lib/supabase/client";
type Log = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  actor_id: string | null;
};
export function AuditLog() {
  const [items, setItems] = useState<Log[]>([]);
  useEffect(() => {
    void createClient()!
      .from("audit_logs")
      .select("id,action,entity_type,entity_id,created_at,actor_id")
      .order("created_at", { ascending: false })
      .limit(100)
      .then((result: { data: unknown[] | null }) =>
        setItems((result.data ?? []) as Log[]),
      );
  }, []);
  return (
    <>
      <PageHeading
        eyebrow="Rastreabilidade"
        title="Histórico de alterações"
        description="Operações administrativas e mudanças importantes."
      />
      <div className="grim-card rounded-2xl p-5">
        {items.length ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-xl bg-white/[.025] p-3"
              >
                <History size={17} className="text-violet-300" />
                <span className="flex-1">
                  <strong className="text-sm">{item.action}</strong>
                  <small className="ml-2 text-zinc-600">
                    {item.entity_type}
                  </small>
                </span>
                <time className="text-xs text-zinc-600">
                  {new Date(item.created_at).toLocaleString("pt-BR")}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">Nenhuma alteração registrada.</p>
        )}
      </div>
    </>
  );
}
