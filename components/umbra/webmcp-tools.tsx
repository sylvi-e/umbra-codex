"use client";

import { useEffect } from "react";

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => Promise<Record<string, unknown>>;
};

type ModelContext = {
  registerTool: (
    tool: ToolDefinition,
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

export function WebMcpTools() {
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const report = (reason: unknown) =>
      console.warn("Não foi possível registrar uma ação assistida.", reason);

    void Promise.resolve(
      context.registerTool(
        {
          name: "start_character_creation",
          title: "Criar nova ficha",
          description:
            "Abre o editor de uma nova ficha de personagem no Umbra Codex.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          async execute(input) {
            if (!input || typeof input !== "object" || Array.isArray(input))
              throw new Error("Entrada inválida.");
            window.location.assign("/fichas/nova");
            return { status: "editor_opened" };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(report);

    void Promise.resolve(
      context.registerTool(
        {
          name: "open_character_sheet",
          title: "Abrir ficha",
          description: "Abre uma ficha pelo identificador informado.",
          inputSchema: {
            type: "object",
            properties: { characterId: { type: "string", format: "uuid" } },
            required: ["characterId"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          async execute(input) {
            const id =
              typeof input === "object" && input && "characterId" in input
                ? String((input as { characterId: unknown }).characterId)
                : "";
            if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))
              throw new Error("Identificador de ficha inválido.");
            window.location.assign(`/fichas/${id}`);
            return { status: "sheet_opened", characterId: id };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(report);

    return () => lifecycle.abort();
  }, []);
  return null;
}
