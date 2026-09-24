"use client";
import { useState } from "react";
import { Dices, Eye, Lock, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
export function DiceRoller({ characterId }: { characterId?: string }) {
  const [formula, setFormula] = useState("1d20 + 0");
  const [visibility, setVisibility] = useState("owner");
  const [result, setResult] = useState<number | null>(null);
  async function roll() {
    const parsed = /^\s*(\d{1,2})d(\d{1,4})\s*([+-]\s*\d+)?\s*$/i.exec(formula);
    if (!parsed) {
      toast.error("Use uma fórmula como 1d20 + 3.");
      return;
    }
    const count = Number(parsed[1]),
      sides = Number(parsed[2]),
      modifier = Number((parsed[3] ?? "0").replace(/\s/g, ""));
    if (count > 50 || sides < 2) {
      toast.error("A fórmula excede os limites permitidos.");
      return;
    }
    const rolls = Array.from({ length: count }, () => {
      const bytes = new Uint32Array(1);
      crypto.getRandomValues(bytes);
      return Number(bytes[0] % sides) + 1;
    });
    const total = rolls.reduce((a, b) => a + b, 0) + modifier;
    setResult(total);
    const client = createClient();
    if (client)
      await client
        .from("dice_rolls")
        .insert({
          character_id: characterId ?? null,
          formula,
          rolls,
          total,
          visibility,
          is_critical: count === 1 && rolls[0] === sides,
          is_fumble: count === 1 && rolls[0] === 1,
        });
  }
  return (
    <section className="grim-card rounded-2xl p-5">
      <h2 className="mb-4 flex items-center gap-2 font-serif text-xl">
        <Dices size={19} className="text-violet-300" />
        Rolagem
      </h2>
      <div className="flex gap-2">
        <Input
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          aria-label="Fórmula de rolagem"
          className="border-white/10 bg-black/20"
        />
        <Button onClick={roll} className="bg-violet-600 hover:bg-violet-500">
          Rolar
        </Button>
      </div>
      <Select value={visibility} onValueChange={setVisibility}>
        <SelectTrigger className="mt-3">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="owner">
            <Lock />
            Privada
          </SelectItem>
          <SelectItem value="masters">
            <Shield />
            Mestres
          </SelectItem>
          <SelectItem value="campaign">
            <Eye />
            Campanha
          </SelectItem>
        </SelectContent>
      </Select>
      {result !== null && (
        <output
          aria-live="polite"
          className="mt-4 grid h-24 place-items-center rounded-2xl border border-violet-300/15 bg-violet-500/[.07] font-serif text-5xl text-violet-100"
        >
          {result}
        </output>
      )}
    </section>
  );
}
