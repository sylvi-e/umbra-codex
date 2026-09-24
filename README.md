# Umbra Codex

Aplicação completa para fichas e campanhas de RPG de fantasia sombria. O projeto usa Next.js, React, TypeScript, Tailwind, Supabase Auth/PostgreSQL/Storage e políticas RLS.

## Recursos implementados

- Cadastro, confirmação de e-mail, login, logout e recuperação de senha pelo Supabase Auth.
- Papéis `admin`, `game_master` e `player`; nenhum cadastro público escolhe cargo.
- Dashboard, fichas, campanhas, perfil e painel administrativo.
- Ficha organizada em Identidade, Combate, Atributos Base, Progressão, Aspecto, Defeito e Nome Verdadeiro.
- Estruturas relacionais para Habilidades, Memórias, Ecos, Inventário, condições, notas, histórico e campos personalizados.
- Salvamento automático com debounce, estado de salvamento e histórico de recursos.
- Rolador seguro com `crypto.getRandomValues`, fórmulas validadas e visibilidade.
- Exportação JSON, duplicação, arquivamento e transferência administrativa por RPC.
- PWA, navegação mobile-first, teclado, labels, foco visível e estados acessíveis.
- Imagens convertidas para WebP antes do upload; buckets organizados e limites de formato/tamanho.

## Configuração local

1. Crie um projeto Supabase separado.
2. Aplique `supabase/migrations/20260920015946_initial_umbra_schema.sql` pelo CLI ou pelo fluxo de migração do projeto.
3. Antes do primeiro cadastro administrativo, execute no SQL Editor, substituindo o e-mail:

   ```sql
   insert into private.admin_allowlist(email) values ('admin@exemplo.com');
   ```

4. Copie `.env.example` para `.env.local` e informe a URL e a publishable key. Não use `service_role` no frontend.
5. Instale e execute:

   ```bash
   pnpm install
   pnpm dev
   ```

## Publicação na Vercel

Importe o repositório, defina `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, configure no Supabase as URLs de redirecionamento de produção e publique. O projeto não depende de APIs exclusivas do ambiente local.

## Segurança

RLS está ativa em todas as tabelas expostas. Jogadores acessam somente fichas próprias; mestres acessam fichas das campanhas sob sua responsabilidade; administradores acessam o sistema inteiro. As verificações são feitas no banco, não apenas na interface.

Consulte `docs/ARCHITECTURE.md` e `docs/DECISIONS.md` para detalhes e regras ainda configuráveis.
