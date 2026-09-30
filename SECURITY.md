# Política de segurança

## Dados e segredos

- Nunca envie `SUPABASE_SERVICE_ROLE_KEY`, chaves privadas do Firebase, tokens ou arquivos de service account ao navegador ou ao Git.
- Variáveis com prefixo `NEXT_PUBLIC_` são públicas e devem conter somente configurações destinadas ao frontend.
- Contas administrativas devem ser provisionadas diretamente no ambiente, sem e-mails pessoais gravados em novas migrations.
- Retratos permanecem em bucket privado; o acesso deve continuar condicionado às funções de autorização do banco.
- Novas tabelas expostas devem ativar RLS e receber testes de isolamento antes da publicação.

## Relato de vulnerabilidades

Não abra uma issue pública contendo tokens, dados pessoais ou instruções de exploração. Envie o relato de forma privada ao mantenedor do repositório, incluindo impacto, passos de reprodução e a versão afetada.

## Checklist antes de publicar

1. Execute `pnpm verify`.
2. Confirme que nenhuma credencial foi adicionada ao diff.
3. Teste as políticas RLS com usuários jogador, mestre e administrador.
4. Verifique upload, leitura e remoção de arquivos privados.
5. Revise alterações em migrations e funções com privilégios elevados.
