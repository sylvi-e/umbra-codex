# Arquitetura

## Camadas

- **Interface:** App Router, componentes client/server, Tailwind e primitivas acessíveis.
- **Identidade:** Supabase Auth com e-mail/senha e sessão persistente.
- **Dados:** PostgreSQL normalizado. JSONB aparece apenas em regras, metadados, opções e valores customizados.
- **Autorização:** RLS e funções auxiliares no schema privado.
- **Arquivos:** buckets separados; mídias públicas usam URL estável e arquivos secretos usam acesso autenticado.

## Modelo de acesso

| Papel | Leitura | Escrita |
| --- | --- | --- |
| Jogador | Próprias fichas e campanhas participantes | Próprias fichas e perfil |
| Mestre | Campanhas sob sua responsabilidade | Fichas e membros dessas campanhas |
| Administrador | Todos os registros | Administração completa e transferência |

Campos secretos permanecem na tabela protegida. Compartilhamento parcial deverá passar por uma função/view sanitizada, nunca por liberação ampla da linha base.

## Persistência e histórico

O editor salva após 900 ms sem interação. Recursos usam RPC transacional e registram valor anterior/novo em `character_history`. Operações administrativas geram `audit_logs`.

## Dados configuráveis

Ranks, classes, tipos de Memória, cores, permissões e fórmulas ficam em `system_options`, `system_settings`, modelos e campos personalizados.
