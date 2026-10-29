# Campanhas e sistemas

Criar campanha exige nome e escolha entre `shadow_slave` (Shadow Slave) e `organization` (A Organização). O sistema fica fixo. A campanha é acessada por `/campanhas/[id]`; o código permite entrar como jogador, sem envio de mensagens ou e-mails. NPCs ficam em uma aba exclusiva de mestres e administradores. Jogadores leem e editam as próprias fichas; mestres também podem editar fichas da campanha. Outros jogadores não recebem acesso a fichas privadas.

## A Organização

A ficha usa o visual de Shadow Slave em identidade, combate, atributos, progressão, inventário, habilidades, arma e notas. Retratos reutilizam upload/recorte WebP, textos reutilizam a paleta de cores, HP tem barra vermelha e HP temporário amarelo; Mana usa barra violeta. Atributos adicionais são editáveis e não alteram os bônus automáticos dos seis atributos do sistema. HP e Mana base começam em 10; deslocamento base em 9 m. Bases são editáveis. A cada 10 pontos: Força +3 espaços, Destreza +4 m, Constituição +10 HP, Inteligência +5 Mana. Modificadores usam `floor(atributo / 2)`, inclusive em zero. Percepção registra marcos de 10 pontos e Interpessoal de 5, aplicados narrativamente pelo mestre.

Inventário começa em 4 espaços. A mochila adiciona capacidade configurável. Cada pilha informa quantidade e espaços totais ocupados; equipado e baú não consomem a capacidade carregada. Itens isentos podem ter zero espaços. Artefatos registram descrição, efeito e malefício. Habilidades registram origem, tipo, custo, duração e descrição. Encantamentos e habilidades iniciais da arma ficam separados. Porcentagem da classe vai de 50 a 100, sem aplicar buffs automáticos.

A Organização usa salvamento manual explícito via RPC transacional `save_organization_character`. O documento completo fica em `character_sheets.organization_data`; HP e Mana são também espelhados em `character_stats` na mesma transação para a listagem. Retrato e HP temporário também são sincronizados com os campos usados pelo restante do hub. O editor Shadow Slave mantém seus dados normalizados e o autosave existente. Não são convertidos campos de Shadow Slave para A Organização.

## Migração e publicação

A migration `20261029125543_campaign_systems.sql` foi aprovada e aplicada em produção em 29/10/2026. A verificação confirmou 8 fichas preservadas, sem IDs ausentes e sem mudanças no conteúdo original, além do vínculo com Nightmare. Em novos ambientes, aplicar a migration antes de publicar o frontend.

1. A migration captura dados atuais de campanhas, fichas e tabelas relacionadas no schema privado, sem acesso por `anon` ou `authenticated`.
2. Adiciona campos com o padrão Shadow Slave, sem recriar fichas nem seus registros associados.
3. Se houver uma única campanha, vincula a ela as fichas sem campanha e inclui seus donos como participantes. No banco inspecionado, isso significa vincular as 8 fichas à campanha existente **Nightmare**. Se houver zero ou várias campanhas, cria uma campanha legada por dono para as fichas sem vínculo.
4. Atualiza RLS, funções de convite e salvamento, e impede trocar sistema, tipo ou campanha de uma ficha existente. A exclusão administrativa de campanha ainda pode desvincular as fichas por `ON DELETE SET NULL`.
5. Aplicar a migration, conferir contagens e IDs, verificar RLS e somente então publicar o frontend.

A cópia privada é um ponto de recuperação de dados, não uma reversão automática de schema. Uma reversão deve considerar novos dados criados após a publicação e nunca restaurar dados antigos por cima deles indiscriminadamente.

## Validação

- `pnpm test`: regressões existentes e limites das fórmulas de A Organização.
- `pnpm test:campaign-db`: PostgreSQL isolado via PGlite, com identidade e storage simulados. Aplica as migrations relevantes e testa preservação de ficha, convites, criação de fichas/NPCs, duplicação, recursos e isolamento de permissões. Não acessa Supabase.
- `pnpm typecheck` e `pnpm build`: tipos e compilação Next.js.

O teste isolado não substitui a verificação de produção após aplicar a migration, nem um teste de interface autenticado com usuários reais.
