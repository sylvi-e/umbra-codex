# Umbra Codex

Aplicação para fichas e campanhas de RPG de fantasia sombria. O projeto usa Next.js, React, TypeScript, Tailwind, Supabase Auth/PostgreSQL/Storage e políticas RLS.

## Recursos implementados

- Entrada e cadastro com Google; o token do Firebase é validado por uma Edge Function e convertido em sessão Supabase.
- Papéis `admin`, `game_master` e `player`; nenhum cadastro público escolhe cargo.
- Dashboard, fichas, campanhas, perfil, NPCs e painel administrativo.
- Ficha organizada em Identidade, Combate, Atributos Base, Progressão, Aspecto, Defeito e Nome Verdadeiro.
- Habilidades, Memórias, Ecos, inventário, condições, notas, histórico e campos personalizados.
- Notas formatáveis, fixáveis, redimensionáveis e disponíveis nos modos de edição e visualização.
- Salvamento automático com debounce, estado de salvamento e histórico de recursos.
- Exportação JSON, duplicação, arquivamento e transferência administrativa por RPC.
- Dois temas, navegação mobile-first, teclado, labels, foco visível e redução de movimentos.
- Retratos recortados em 512 × 512, convertidos para WebP e comprimidos antes do upload privado.
- PWA instalável com cache apenas da interface pública e dos arquivos estáticos; dados autenticados continuam dependentes da rede.

## Configuração local

1. Crie um projeto Supabase separado.
2. Aplique as migrations de `supabase/migrations` pelo CLI ou pelo fluxo de migração do projeto.
3. Antes do primeiro cadastro administrativo, execute no SQL Editor, substituindo o e-mail:

   ```sql
   insert into private.admin_allowlist(email) values (lower('admin@exemplo.com'));
   ```

4. Copie `.env.example` para `.env.local` e informe as configurações públicas do Supabase e do Firebase. Nunca exponha `service_role`, service accounts ou chaves privadas no frontend.
5. Instale e execute:

   ```bash
   pnpm install
   pnpm dev
   ```

## Verificação

Execute todas as verificações usadas pelo CI:

```bash
pnpm verify
```

O comando valida lint, TypeScript, testes e build de produção.

## Publicação na Vercel

Importe o repositório, configure as variáveis documentadas em `.env.example`, cadastre as URLs de redirecionamento no Supabase e publique. Pull requests são validados pelo workflow de CI antes do merge.

## Segurança

RLS está ativa nas tabelas expostas. Jogadores acessam somente fichas próprias; mestres acessam as campanhas sob sua responsabilidade; administradores acessam o sistema inteiro. As verificações de autorização ficam no banco, não apenas na interface.

Não inclua e-mails pessoais, tokens ou identificadores de contas administrativas em novas migrations. Consulte `SECURITY.md`, `docs/ARCHITECTURE.md` e `docs/DECISIONS.md`.
